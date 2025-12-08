export { handleError, setErrorHandler } from './error-handling.ts'
export {
  dispatchError,
  runSilent,
  runThrowing,
  errorContexts,
  handlerPhases,
  propagateMode,
} from './error-channel.ts'
export type {
  ErrorChannelAfterHook,
  ErrorChannelBeforeHook,
  ErrorChannelOptions,
  ErrorContext,
  ErrorHandlerPhase,
  ErrorMeta,
  ErrorPropagationStrategy,
  ErrorToken,
} from './error-channel.ts'
export type { PlainObject, PropsShape } from './types.ts'
export { isArrayIndex, isDevEnvironment, isNil, isObject, isPlainObject } from './utils.ts'
