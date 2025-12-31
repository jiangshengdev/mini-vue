/**
 * Shared 模块入口。
 *
 * 本模块聚合跨子域的基础能力与类型，作为各子域的统一入口，包括：
 * - 上下文栈管理：`ContextStack`
 * - 调试日志：`createDebugLogger`
 * - 环境检测：`__DEV__`、`__INTERNAL_DEV__`、`isDevDebugEnvironment`
 * - 错误通道：`dispatchError`、`runSilent`、`runThrowing`
 * - 错误处理：`handleError`、`setErrorHandler`
 * - 依赖注入：`InjectionKey`、`InjectionToken`
 * - 插件契约：`PluginInstallApp`
 * - 通用类型：`PlainObject`、`PropsShape`
 * - 工具函数：`isNil`、`isObject`、`isPlainObject`、`isArrayIndex`、`isThenable`
 */
export { ContextStack } from './context-stack.ts'
export { createDebugLogger } from './debug.ts'
export type { DebugLogger } from './debug.ts'
export type { DevtoolsSetupStateCollector, DevtoolsSetupStateKind } from './devtools-setup-state.ts'
export {
  collectDevtoolsSetupState,
  withDevtoolsSetupStateCollectionPaused,
  withDevtoolsSetupStateCollector,
} from './devtools-setup-state.ts'
export { __DEV__, __INTERNAL_DEV__, isDevDebugEnvironment } from './env.ts'
export {
  dispatchError,
  errorContexts,
  errorMode,
  errorPhases,
  runSilent,
  runThrowing,
} from './error-channel.ts'
export type {
  ErrorAfterHook,
  ErrorBeforeHook,
  ErrorContext,
  ErrorMeta,
  ErrorMode,
  ErrorPhase,
  ErrorRunOptions,
  ErrorToken,
  ThrowingErrorRunOptions,
} from './error-channel.ts'
export type { ErrorHandler, ErrorPayload } from './error-handling.ts'
export { handleError, setErrorHandler } from './error-handling.ts'
export type { InjectionKey, InjectionToken } from './injection.ts'
export type { PluginDefinition, PluginInstallApp, PluginObject, PluginUninstall } from './plugin.ts'
export type { PlainObject, PropsShape, WithOptionalProp } from './types.ts'
export { isArrayIndex, isNil, isObject, isPlainObject, isThenable } from './utils.ts'
