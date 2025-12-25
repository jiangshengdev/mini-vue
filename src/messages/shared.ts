/**
 * 共享工具子域消息文案
 *
 * 本模块定义 `src/shared` 中跨子域工具相关的错误文案，
 * 目前仅包含错误通道（error channel）相关的约束提示。
 *
 * 命名约定：`shared` + 功能点 + 语义（如 `sharedRunnerNoPromise`）
 */

/**
 * `runWithChannel` 不支持异步返回值的错误
 *
 * `runWithChannel` 用于在错误通道上下文中执行同步函数；
 * 若 runner 返回 Promise 或 thenable，会破坏错误捕获的同步语义，
 * 因此抛出此错误要求调用方使用同步函数。
 */
export const sharedRunnerNoPromise =
  'runWithChannel: runner 不支持 Promise 或 thenable 返回值，请使用同步函数'
