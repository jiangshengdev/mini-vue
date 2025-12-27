import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

type SchedulerJob = () => void

/** 等待执行的调度任务队列，使用数组保持触发顺序。 */
const jobQueue: SchedulerJob[] = []
/** 去重集合，保证同一任务在一次 flush 中只会运行一次。 */
const pendingJobSet = new Set<SchedulerJob>()

/** 标记是否已安排过本轮微任务 flush。 */
let isFlushPending = false
/** 标记是否正在执行 flush，防止重复调度。 */
let isFlushing = false

/** 共用的已解析 Promise，用于创建微任务。 */
const resolvedPromise = Promise.resolve()
/** 当前 flush 对应的 Promise，供 `nextTick` 复用。 */
let currentFlushPromise: Promise<void> | undefined

/**
 * 将渲染任务入队，使用微任务批量执行并去重。
 *
 * @remarks
 * - 同一任务在一次 flush 中只会运行一次，后续触发仅更新最新的 runner 引用。
 * - flush 过程中触发的新任务会被加入当前队列，确保同一轮内完成。
 */
export function queueSchedulerJob(job: SchedulerJob): void {
  if (!pendingJobSet.has(job)) {
    pendingJobSet.add(job)
    jobQueue.push(job)
  }

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

  let jobIndex = 0

  try {
    while (jobIndex < jobQueue.length) {
      const job = jobQueue[jobIndex]

      runSilent(job, {
        origin: errorContexts.scheduler,
        handlerPhase: errorPhases.async,
      })

      jobIndex += 1
    }
  } finally {
    jobQueue.length = 0
    pendingJobSet.clear()
    isFlushing = false
    currentFlushPromise = undefined
  }
}
