import type { DependencyBucket, EffectInstance } from '../contracts/index.ts'
import { effectStack } from '../effect.ts'
import { enqueueEffect } from './batch.ts'
import { canTrack } from './tracking.ts'
import type { PlainObject } from '@/shared/index.ts'

/**
 * 收集当前活跃的副作用到依赖集合，确保后续触发时能够回调。
 *
 * @param dependencyBucket - 目标字段对应的副作用集合
 * @param debugInfo - 可选的调试信息，仅在开发态使用
 *
 * @remarks
 * - 依赖收集被显式禁用时（如写入阶段读取旧值）会直接跳过。
 * - 已停止或已存在于集合中的副作用不会被重复收集。
 * - 建立双向关联：依赖集合记录副作用，副作用记录关联的依赖集合。
 */
export function trackEffect(dependencyBucket: DependencyBucket, debugInfo?: PlainObject): void {
  /*
   * 依赖收集被显式禁用时直接跳过。
   *
   * @remarks
   * - 该分支主要用于屏蔽「写入前读旧值 / 创建期探测」这类读取带来的意外收集。
   * - 这里不仅影响 `reactive` 的 `track`，也会影响 `ref.value` 等通过 `trackEffect` 收集的路径。
   */
  if (!canTrack()) {
    return
  }

  const currentEffect = effectStack.current

  /* 没有当前副作用入栈时直接返回，避免空收集开销 */
  if (!currentEffect) {
    return
  }

  /* 已停止的副作用不应重新进入依赖集合，防止死效果并阻断 `stop` 清理 */
  if (!currentEffect.active) {
    return
  }

  /* 已存在于集合中的副作用无需重复登记，防止死循环 */
  if (dependencyBucket.has(currentEffect)) {
    return
  }

  /* 建立双向关联：依赖记录副作用，副作用记录关联的依赖 */
  dependencyBucket.add(currentEffect)
  currentEffect.recordDependency(dependencyBucket, debugInfo)
}

/**
 * 触发依赖集合中的副作用，按照快照顺序执行。
 *
 * @param dependencyBucket - 目标字段对应的副作用集合
 *
 * @remarks
 * - 使用快照避免遍历过程中依赖集合被修改导致的问题。
 * - 跳过当前正在执行的 effect 和已停止的 effect。
 * - 通过 `enqueueEffect` 统一调度，支持批处理场景。
 */
export function triggerEffects(dependencyBucket: DependencyBucket): void {
  /* 空集合无需触发，快速退出 */
  if (dependencyBucket.size === 0) {
    return
  }

  /* 使用快照避免遍历过程中依赖集合被修改 */
  for (const effect of depSnapshot(dependencyBucket)) {
    /* 仅执行仍处于活跃状态的副作用，跳过当前 effect */
    if (shouldRun(effect)) {
      enqueueEffect(effect)
    }
  }
}

/**
 * 拷贝一份依赖集合，保证触发期间的稳定遍历。
 *
 * @param dependencyBucket - 原始依赖集合
 * @returns 依赖集合的浅拷贝
 */
function depSnapshot(dependencyBucket: DependencyBucket): DependencyBucket {
  return new Set(dependencyBucket)
}

/**
 * 判断副作用是否应在当前调度周期内运行。
 *
 * @param effect - 要检查的副作用实例
 * @returns 若应该运行则返回 `true`
 *
 * @remarks
 * - 避免重复执行当前正在运行的 effect（防止无限循环）。
 * - 跳过已停止的 effect。
 */
function shouldRun(effect: EffectInstance): boolean {
  /* 避免重复执行当前 effect，并确保目标 effect 尚未停止。 */
  return effect !== effectStack.current && effect.active
}
