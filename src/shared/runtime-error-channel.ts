import { handleRuntimeError } from './error-handling.ts'
import type { PlainObject } from '@/shared/types.ts'

export type RuntimeErrorContext =
  | 'scheduler'
  | 'effect-runner'
  | 'effect-cleanup'
  | 'effect-scope-run'
  | 'effect-scope-cleanup'
  | 'watch-callback'
  | 'watch-cleanup'
  | 'component-setup'
  | 'component-cleanup'
  | 'computed-setter'

export type RuntimeErrorPropagationStrategy = 'sync' | 'silent'
export type RuntimeErrorHandlerPhase = 'sync' | 'async'

export type RuntimeErrorMeta = Readonly<PlainObject>

interface RuntimeErrorDispatchOptions {
  readonly origin: RuntimeErrorContext
  readonly handlerPhase: RuntimeErrorHandlerPhase
  readonly meta?: RuntimeErrorMeta
  readonly shouldRethrowAsync?: boolean
}

export interface RuntimeErrorToken {
  readonly error: unknown
  readonly origin: RuntimeErrorContext
  readonly handlerPhase: RuntimeErrorHandlerPhase
  readonly meta?: RuntimeErrorMeta
  /** 当前 dispatch 是否实际触发错误处理器，便于上层判断是否需要额外补偿。 */
  readonly notified: boolean
}

export type ErrorChannelBeforeHook = () => void
export type ErrorChannelAfterHook = (token?: RuntimeErrorToken) => void

export interface RunWithErrorChannelOptions extends RuntimeErrorDispatchOptions {
  readonly propagate: RuntimeErrorPropagationStrategy
  readonly beforeRun?: ErrorChannelBeforeHook
  readonly afterRun?: ErrorChannelAfterHook
}

const notifiedErrorRegistry = new WeakSet<PlainObject>()

export function dispatchRuntimeError(
  error: unknown,
  dispatchOptions: RuntimeErrorDispatchOptions,
): RuntimeErrorToken {
  const shouldTrack = typeof error === 'object' && error !== null
  const alreadyNotified = shouldTrack && notifiedErrorRegistry.has(error as PlainObject)
  const shouldNotify = !alreadyNotified

  const token: RuntimeErrorToken = {
    error,
    origin: dispatchOptions.origin,
    handlerPhase: dispatchOptions.handlerPhase,
    meta: dispatchOptions.meta,
    notified: shouldNotify,
  }

  if (!shouldNotify) {
    return token
  }

  if (shouldTrack) {
    notifiedErrorRegistry.add(error as PlainObject)
  }

  handleRuntimeError(
    error,
    {
      origin: dispatchOptions.origin,
      handlerPhase: dispatchOptions.handlerPhase,
      meta: dispatchOptions.meta,
      token,
    },
    dispatchOptions.handlerPhase === 'async' && dispatchOptions.shouldRethrowAsync !== false,
  )

  return token
}

export function runWithErrorChannel<T>(
  runner: () => T,
  options: RunWithErrorChannelOptions & { propagate: 'sync' },
): T
export function runWithErrorChannel<T>(
  runner: () => T,
  options: RunWithErrorChannelOptions & { propagate: 'silent' },
): T | undefined

export function runWithErrorChannel<T>(
  runner: () => T,
  options: RunWithErrorChannelOptions,
): T | undefined {
  options.beforeRun?.()

  let token: RuntimeErrorToken | undefined

  try {
    return runner()
  } catch (error) {
    token = dispatchRuntimeError(error, options)

    if (options.propagate === 'sync') {
      throw error
    }

    return undefined
  } finally {
    options.afterRun?.(token)
  }
}
