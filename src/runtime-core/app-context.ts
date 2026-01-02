/**
 * 管理应用级上下文栈，供渲染期间透传 root `provides` 等应用信息。
 */
import type { AppContext } from './create-app.ts'
import { ContextStack } from '@/shared/index.ts'

/** 当前正在执行的应用上下文栈，支持嵌套 `render`。 */
const appContextStack = new ContextStack<AppContext>()

/**
 * 设置「当前正在执行」的应用上下文。
 *
 * @remarks
 * - 该上下文主要用于把应用级 provides 传入根组件创建链路。
 * - 允许嵌套（例如在一个渲染过程中触发另一次 `render`）。
 *
 * @param context - 将要设为当前的应用上下文
 */
export function setCurrentAppContext(context: AppContext): void {
  appContextStack.push(context)
}

/**
 * 退出当前应用上下文，恢复到上一层（若存在）。
 */
export function unsetCurrentAppContext(): void {
  appContextStack.pop()
}

/**
 * 读取当前应用上下文。
 *
 * @remarks
 * - 仅在 `createApp.mount()` 触发的渲染窗口期内保证存在。
 *
 * @returns 当前应用上下文或 `undefined`
 */
export function getCurrentAppContext(): AppContext | undefined {
  return appContextStack.current
}
