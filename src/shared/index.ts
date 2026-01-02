/**
 * Shared 模块入口，聚合跨子域的通用能力与类型，方便外部一次性引入。
 * 不包含额外逻辑，仅做导出汇总，保持 tree-shaking 与依赖面稳定。
 * 为 runtime-core、runtime-dom 等子域提供统一的基础依赖出口。
 */
export { ContextStack } from './context-stack.ts'
export { createDebugLogger } from './debug.ts'
export type { DebugLogger } from './debug.ts'
export type { DevtoolsSetupStateCollector, DevtoolsSetupStateKind } from './devtools-setup-state.ts'
export {
  collectDevtoolsSetupState,
  registerDevtoolsSetupStateName,
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
