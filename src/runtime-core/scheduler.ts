/**
 * runtime-core 的调度器实现：以微任务批量 flush 的方式合并更新任务。
 *
 * @remarks
 * - 设计目标与 Vue3 scheduler 类似：支持按 id 排序、去重、递归更新上限与 pre/post 队列。
 * - 该模块仅负责“何时执行”，不关心任务的具体语义（组件更新、watch 回调、生命周期 hook 等）。
 */
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

/**
 * 调度器任务的最小接口。
 *
 * @remarks
 * - `id` 用于稳定排序（常用组件 uid / postOrderId）；缺省按 Infinity 处理。
 * - `queued`/`disposed` 由调度器内部维护，用于去重与卸载后的过期防护。
 */
export interface SchedulerJob {
  /** 用于排序的稳定 id（如组件 uid），缺省视为 Infinity。 */
  id?: number
  /** 标记任务是否已在当前队列入队，用于去重。 */
  queued?: boolean
  /** 标记任务是否已被标记为过期（组件卸载后跳过已入队的 hook 等）。 */
  disposed?: boolean

  (): void
}

/** 等待执行的调度任务队列，使用数组保持稳定顺序。 */
const jobQueue: SchedulerJob[] = []
/** 渲染前的回调队列（如 `watch` flush: pre）。 */
const preFlushQueue: SchedulerJob[] = []
/** 渲染后的回调队列（如 `watch` flush: post、生命周期 hook）。 */
const postFlushQueue: SchedulerJob[] = []

/** 当前 main queue 正在处理的索引，用于 flush 期间插入排序。 */
let flushIndex = -1

/** 标记是否已安排过本轮微任务 flush。 */
let isFlushPending = false
/** 标记是否正在执行 flush，供内部状态判断。 */
let isFlushing = false

/** 共用的已解析 Promise，用于创建微任务。 */
const resolvedPromise = Promise.resolve()
/** 当前 flush 对应的 Promise，供 `nextTick` 复用。 */
let currentFlushPromise: Promise<void> | undefined

/** 同一轮 flush 内允许单个 job 递归执行的最大次数（对齐 Vue3）。 */
const recursionLimit = 100

type RecursionCountMap = Map<SchedulerJob, number>

function getJobId(job: SchedulerJob): number {
  return job.id ?? Infinity
}

function markJobQueued(job: SchedulerJob): void {
  job.queued = true
}

function clearJobQueued(job: SchedulerJob): void {
  job.queued = false
}

function isJobQueued(job: SchedulerJob): boolean {
  return job.queued === true
}

function isJobDisposed(job: SchedulerJob): boolean {
  return job.disposed === true
}

function findInsertionIndex(id: number): number {
  let start = flushIndex + 1
  let end = jobQueue.length

  while (start < end) {
    const middle = Math.floor((start + end) / 2)
    const middleJobId = getJobId(jobQueue[middle])

    if (middleJobId < id) {
      start = middle + 1
    } else {
      end = middle
    }
  }

  return start
}

function queueJobToMainQueue(job: SchedulerJob): void {
  const jobId = getJobId(job)
  const last = jobQueue.at(-1)

  if (!last || jobId >= getJobId(last)) {
    jobQueue.push(job)

    return
  }

  jobQueue.splice(findInsertionIndex(jobId), 0, job)
}

function checkRecursiveUpdates(seen: RecursionCountMap, job: SchedulerJob): boolean {
  const count = seen.get(job) ?? 0

  if (count >= recursionLimit) {
    runSilent(
      () => {
        throw new Error(
          `[scheduler] 检测到可能的递归更新：同一任务在一次 flush 中执行超过 ${recursionLimit} 次`,
        )
      },
      {
        origin: errorContexts.scheduler,
        handlerPhase: errorPhases.async,
      },
    )

    return true
  }

  seen.set(job, count + 1)

  return false
}

/**
 * 标记调度器当前是否处于 flush 阶段。
 *
 * @remarks
 * - 供 runtime-core 在「同步 patch」与「异步调度 flush」之间选择错误阶段标记使用。
 */
export function isSchedulerFlushing(): boolean {
  return isFlushing
}

/**
 * 将任务标记为过期（常用于组件卸载后跳过已入队的 post hooks）。
 */
export function disposeSchedulerJob(job: SchedulerJob | undefined): void {
  if (!job) {
    return
  }

  job.disposed = true
}

/**
 * 将渲染任务入队，使用微任务批量执行并去重。
 *
 * @remarks
 * - 同一任务在一次 flush 中只会运行一次，后续触发仅更新最新的 runner 引用。
 * - flush 过程中触发的新任务会被加入当前队列，确保同一轮内完成。
 */
export function queueSchedulerJob(job: SchedulerJob): void {
  if (isJobDisposed(job) || isJobQueued(job)) {
    return
  }

  markJobQueued(job)
  queueJobToMainQueue(job)

  queueFlush()
}

/**
 * 将回调加入渲染前队列，按插入顺序执行并去重。
 */
export function queuePreFlushCb(job: SchedulerJob): void {
  if (isJobDisposed(job) || isJobQueued(job)) {
    return
  }

  markJobQueued(job)
  preFlushQueue.push(job)

  queueFlush()
}

/**
 * 将回调加入渲染后队列，按插入顺序执行并去重。
 */
export function queuePostFlushCb(job: SchedulerJob): void {
  if (isJobDisposed(job) || isJobQueued(job)) {
    return
  }

  markJobQueued(job)
  postFlushQueue.push(job)

  queueFlush()
}

/**
 * 暴露给外部的微任务入口，等待当前调度队列完成后再执行回调。
 *
 * @remarks
 * - 若传入回调，等调度 flush 结束后调用并返回新的 Promise。
 * - 未传入回调时直接返回可 await 的 Promise，便于 `await nextTick()`。
 */
export async function nextTick<T>(callback?: () => T | Promise<T>): Promise<T | void> {
  const flushPromise = currentFlushPromise ?? resolvedPromise

  if (callback) {
    await flushPromise

    return callback()
  }

  return flushPromise
}

/**
 * 安排一次微任务执行队列，避免重复注册。
 */
function queueFlush(): void {
  if (isFlushing || isFlushPending) {
    return
  }

  isFlushPending = true
  currentFlushPromise = (async () => {
    await resolvedPromise
    flushJobs()
  })()
}

/**
 * 执行当前收集到的所有调度任务，确保顺序与去重。
 */
function flushJobs(): void {
  isFlushPending = false
  isFlushing = true

  const seen: RecursionCountMap = new Map()

  try {
    /*
     * Flush 过程中 post 队列可能再次触发更新（如 `onMounted` 内写状态），
     * 因此需要循环直到三类队列都清空，避免吞掉后续任务。
     */
    while (jobQueue.length > 0 || preFlushQueue.length > 0 || postFlushQueue.length > 0) {
      flushPreFlushCbs(seen)
      flushMainQueue(seen)
      flushPostFlushCbs(seen)
    }
  } finally {
    jobQueue.length = 0
    preFlushQueue.length = 0
    postFlushQueue.length = 0
    isFlushing = false
    currentFlushPromise = undefined
    flushIndex = -1
  }
}

/**
 * Flush 渲染前队列：保持插入顺序执行，并允许回调在执行时继续入队本轮 pre 队列。
 */
function flushPreFlushCbs(seen: RecursionCountMap): void {
  if (preFlushQueue.length === 0) {
    return
  }

  let preIndex = 0

  while (preIndex < preFlushQueue.length) {
    const job = preFlushQueue[preIndex]

    clearJobQueued(job)

    if (isJobDisposed(job) || checkRecursiveUpdates(seen, job)) {
      preIndex += 1
      continue
    }

    runSilent(job, {
      origin: errorContexts.scheduler,
      handlerPhase: errorPhases.async,
    })

    preIndex += 1
  }

  preFlushQueue.length = 0
}

/**
 * Flush 主队列：按 id 顺序执行已入队的更新任务，并允许 flush 期间插入新任务。
 */
function flushMainQueue(seen: RecursionCountMap): void {
  if (jobQueue.length === 0) {
    return
  }

  for (flushIndex = 0; flushIndex < jobQueue.length; flushIndex += 1) {
    const job = jobQueue[flushIndex]

    clearJobQueued(job)

    if (isJobDisposed(job) || checkRecursiveUpdates(seen, job)) {
      continue
    }

    runSilent(job, {
      origin: errorContexts.scheduler,
      handlerPhase: errorPhases.async,
    })
  }

  jobQueue.length = 0
  flushIndex = -1
}

/**
 * Flush 后置队列：复制并按 id 排序后执行，避免本轮追加导致遍历错乱。
 *
 * @remarks
 * - 常用于生命周期 hook、watch flush: post 等需要在“渲染后”触发的回调。
 * - 复制 + 清空策略允许回调在执行时再次入队下一轮任务。
 */
function flushPostFlushCbs(seen: RecursionCountMap): void {
  if (postFlushQueue.length === 0) {
    return
  }

  const jobs = [...postFlushQueue].sort((a, b) => {
    return getJobId(a) - getJobId(b)
  })

  postFlushQueue.length = 0

  for (const job of jobs) {
    clearJobQueued(job)

    if (isJobDisposed(job) || checkRecursiveUpdates(seen, job)) {
      continue
    }

    runSilent(job, {
      origin: errorContexts.scheduler,
      handlerPhase: errorPhases.async,
    })
  }
}
