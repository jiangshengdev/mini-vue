import { ContextStack } from '@/shared/index.ts'

/**
 * 依赖收集开关的“栈式”状态。
 *
 * @remarks
 * - 之所以用栈而不是单个布尔值，是为了支持嵌套调用：内层禁用不应破坏外层的状态。
 * - 默认行为是允许收集（栈为空时返回 true）。
 */
const trackingStack = new ContextStack<boolean>()

/**
 * 是否允许在当前调用栈中进行依赖收集。
 *
 * 用于修复“写入阶段读旧值/创建阶段探测”导致的意外依赖收集。
 */
export function canTrack(): boolean {
  return trackingStack.current ?? true
}

/** 暂停依赖收集（可嵌套）。 */
export function pauseTracking(): void {
  trackingStack.push(false)
}

/** 恢复依赖收集（与 `pauseTracking` 成对）。 */
export function restoreTracking(): void {
  trackingStack.pop()
}

/**
 * 在禁用依赖收集的上下文中执行函数。
 */
export function withoutTracking<T>(callback: () => T): T {
  pauseTracking()

  try {
    return callback()
  } finally {
    restoreTracking()
  }
}
