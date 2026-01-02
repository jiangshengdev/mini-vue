/**
 * 控制依赖收集开关的工具，支持嵌套禁用/恢复。
 *
 * @remarks
 * - 提供 `canTrack`、`pauseTracking`、`restoreTracking`、`withoutTracking` 等 API。
 * - 通过栈式状态保证嵌套场景下的正确性。
 */
import { ContextStack } from '@/shared/index.ts'

/**
 * 依赖收集开关的「栈式」状态。
 *
 * @remarks
 * - 使用栈而非单个布尔值，是为了支持嵌套调用：内层禁用不应破坏外层的状态。
 * - 默认行为是允许收集（栈为空时返回 `true`）。
 * - 常用于「写入前读旧值」「创建期探测」等需要临时禁用收集的场景。
 */
const trackingStack = new ContextStack<boolean>()

/**
 * 判断当前调用栈中是否允许进行依赖收集。
 *
 * @returns 若允许收集则返回 `true`
 *
 * @remarks
 * - 用于修复「写入阶段读旧值」「创建阶段探测」导致的意外依赖收集。
 * - 栈为空时默认允许收集。
 */
export function canTrack(): boolean {
  return trackingStack.current ?? true
}

/**
 * 暂停依赖收集（可嵌套）。
 *
 * @remarks
 * - 必须与 `restoreTracking()` 成对调用。
 * - 推荐使用 `withoutTracking()` 包装器以确保正确配对。
 */
export function pauseTracking(): void {
  trackingStack.push(false)
}

/**
 * 恢复依赖收集（与 `pauseTracking` 成对）。
 *
 * @remarks
 * - 弹出栈顶状态，恢复到上一层的收集状态。
 */
export function restoreTracking(): void {
  trackingStack.pop()
}

/**
 * 在禁用依赖收集的上下文中执行函数。
 *
 * @param callback - 要执行的函数
 * @returns 函数的返回值
 *
 * @remarks
 * - 自动处理 `pauseTracking`/`restoreTracking` 的配对调用。
 * - 即使回调抛出异常也会正确恢复收集状态。
 */
export function withoutTracking<T>(callback: () => T): T {
  pauseTracking()

  try {
    return callback()
  } finally {
    restoreTracking()
  }
}
