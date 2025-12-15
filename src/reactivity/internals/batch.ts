import type { EffectInstance } from '../contracts/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

/** 当前批处理嵌套深度：用于支持 start/end 成对调用并允许嵌套批处理。 */
let batchDepth = 0

/** 批处理期间收集的副作用集合：使用 Set 去重，保证同一 effect 在一次 flush 中只执行一次。 */
let pendingEffects: Set<EffectInstance> | undefined

/** 判断当前是否处于批处理上下文中。 */
export function isBatching(): boolean {
  return batchDepth > 0
}

/** 进入一次批处理上下文：允许嵌套调用并通过 depth 统一管理退出时机。 */
export function startBatch(): void {
  batchDepth += 1
}

/**
 * 退出一次批处理上下文。
 *
 * @remarks
 * - 只有最外层 batch 退出时才会触发 flush。
 * - depth 为 0 时调用属于不匹配的 end，直接忽略以保持调用方简单。
 */
export function endBatch(): void {
  /* 防御性处理：避免不成对调用导致 depth 变为负数。 */
  if (batchDepth === 0) {
    return
  }

  batchDepth -= 1

  /* 内层 batch 退出时不 flush，等最外层退出再统一执行。 */
  if (batchDepth > 0) {
    return
  }

  flushPendingEffects()
}

/**
 * 在批处理上下文中执行 fn，并在最外层退出时一次性刷新期间收集的副作用。
 *
 * @remarks
 * - 通过 try/finally 确保异常情况下也能正确 endBatch，避免批处理状态泄漏。
 */
export function runInBatch<T>(fn: () => T): T {
  startBatch()

  try {
    return fn()
  } finally {
    endBatch()
  }
}

/**
 * 将 effect 纳入批处理调度：批处理中入队去重，非批处理则立即执行。
 */
export function enqueueEffect(effect: EffectInstance): void {
  if (isBatching()) {
    /* 延迟初始化集合，避免多数场景下的额外分配。 */
    pendingEffects ??= new Set()

    pendingEffects.add(effect)

    return
  }

  runEffect(effect)
}

/**
 * 刷新当前批处理期间收集的 effects。
 *
 * @remarks
 * - 先“快照 + 清空”再执行，避免执行过程中新入队的 effect 被当前 flush 吞掉。
 * - 执行顺序以 Set 的插入顺序为准，符合“去重但稳定”的预期。
 */
function flushPendingEffects(): void {
  if (!pendingEffects) {
    return
  }

  const effectsToRun = pendingEffects

  pendingEffects = undefined

  /* 逐个执行收集到的副作用，由 runEffect 统一处理 scheduler 与错误通道。 */
  for (const effect of effectsToRun) {
    runEffect(effect)
  }
}

/**
 * 执行单个 effect：若带 scheduler 则交给 scheduler 调度，否则直接运行。
 */
function runEffect(effect: EffectInstance): void {
  const { scheduler } = effect

  if (scheduler) {
    /* 统一给 scheduler 一个“可执行任务”，由其决定何时/如何运行。 */
    const schedulerJob = () => {
      /* 即便 effect 已停止也要执行一次原函数，与 Vue 行为保持一致 */
      effect.run()
    }

    /* 通过共享错误通道包装用户态 scheduler，避免异常直接穿透到内部调度栈。 */
    runSilent(
      () => {
        scheduler(schedulerJob)
      },
      {
        origin: errorContexts.scheduler,
        handlerPhase: errorPhases.sync,
      },
    )

    return
  }

  /* 无 scheduler 时同步执行：由 effect.run 自身管理依赖收集与清理。 */
  effect.run()
}
