import { handleRuntimeError } from './error-handling.ts'

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

export type RuntimeErrorOrigin = RuntimeErrorContext
export type RuntimeErrorPropagationStrategy = 'sync' | 'swallow'
export type RuntimeErrorHandlerPhase = 'sync' | 'async'

export interface RuntimeErrorMeta {
  readonly [key: string]: unknown
}

interface RuntimeErrorDescriptor {
  readonly origin: RuntimeErrorOrigin
  readonly handlerPhase: RuntimeErrorHandlerPhase
  readonly meta?: RuntimeErrorMeta
  readonly rethrowAsyncFallback?: boolean
}

export interface RuntimeErrorToken {
  readonly error: unknown
  readonly origin: RuntimeErrorOrigin
  readonly handlerPhase: RuntimeErrorHandlerPhase
  readonly meta?: RuntimeErrorMeta
  /** 当前 dispatch 是否实际触发错误处理器，便于上层判断是否需要额外补偿。 */
  readonly notified: boolean
}

export interface RunWithErrorChannelOptions extends RuntimeErrorDescriptor {
  readonly propagate: RuntimeErrorPropagationStrategy
  readonly beforeRun?: () => void
  readonly afterRun?: (token?: RuntimeErrorToken) => void
}

const notifiedErrorRegistry = new WeakSet<object>()

export function dispatchRuntimeError(
  error: unknown,
  descriptor: RuntimeErrorDescriptor,
): RuntimeErrorToken {
  const shouldTrack = typeof error === 'object' && error !== null
  const alreadyNotified = shouldTrack && notifiedErrorRegistry.has(error as object)
  const shouldNotify = !alreadyNotified

  const token: RuntimeErrorToken = {
    error,
    origin: descriptor.origin,
    handlerPhase: descriptor.handlerPhase,
    meta: descriptor.meta,
    notified: shouldNotify,
  }

  if (!shouldNotify) {
    return token
  }

  if (shouldTrack) {
    notifiedErrorRegistry.add(error as object)
  }

  handleRuntimeError(
    error,
    {
      origin: descriptor.origin,
      handlerPhase: descriptor.handlerPhase,
      meta: descriptor.meta,
      token,
    },
    descriptor.handlerPhase === 'async' && descriptor.rethrowAsyncFallback !== false,
  )

  return token
}

export function runWithErrorChannel<T>(
  runner: () => T,
  options: RunWithErrorChannelOptions & { propagate: 'sync' },
): T
export function runWithErrorChannel<T>(
  runner: () => T,
  options: RunWithErrorChannelOptions & { propagate: 'swallow' },
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
