import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubGlobalQueueMicrotask } from '$/test-utils/mocks.ts'
import type { ErrorHandler } from '@/index.ts'
import { setErrorHandler } from '@/index.ts'
import { sharedRunnerNoPromise } from '@/messages/index.ts'
import type { ErrorAfterHook } from '@/shared/index.ts'
import {
  dispatchError,
  errorContexts,
  errorPhases,
  runSilent,
  runThrowing,
} from '@/shared/index.ts'

describe('runtime-error-channel', () => {
  beforeEach(() => {
    setErrorHandler(undefined)
  })

  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('dispatchRuntimeError 只会上报一次相同的 error', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const error = new Error('component boom')

    const firstToken = dispatchError(error, {
      origin: errorContexts.componentSetup,
      handlerPhase: errorPhases.sync,
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(firstToken.notified).toBe(true)

    const [, context, payload] = handler.mock.calls[0]

    expect(context).toBe(errorContexts.componentSetup)
    expect(payload?.token).toBe(firstToken)

    const secondToken = dispatchError(error, {
      origin: errorContexts.effectRunner,
      handlerPhase: errorPhases.async,
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(secondToken.notified).toBe(false)
  })

  it('dispatchRuntimeError 在不同 tick 仍会上报同一 error', async () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const error = new Error('tick crash')

    const firstToken = dispatchError(error, {
      origin: errorContexts.componentSetup,
      handlerPhase: errorPhases.sync,
    })

    expect(firstToken.notified).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)

    await Promise.resolve()

    const secondToken = dispatchError(error, {
      origin: errorContexts.effectRunner,
      handlerPhase: errorPhases.sync,
    })

    expect(secondToken.notified).toBe(true)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('嵌套 runWithErrorChannelThrow 共享同一错误时只通知一次', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const error = new Error('nested crash')
    const outerAfterRun = vi.fn<ErrorAfterHook>()
    const innerAfterRun = vi.fn<ErrorAfterHook>()

    const throwNestedError = () => {
      throw error
    }

    const runInnerChannel = () => {
      return runThrowing(throwNestedError, {
        origin: errorContexts.componentSetup,
        handlerPhase: errorPhases.sync,
        afterRun: innerAfterRun,
      })
    }

    const runNestedChannel = () => {
      return runThrowing(runInnerChannel, {
        origin: errorContexts.effectScopeRun,
        handlerPhase: errorPhases.sync,
        afterRun: outerAfterRun,
      })
    }

    expect(runNestedChannel).toThrow(error)

    expect(handler).toHaveBeenCalledTimes(1)

    const [, context, payload] = handler.mock.calls[0]

    expect(context).toBe(errorContexts.componentSetup)
    expect(payload?.token?.notified).toBe(true)

    expect(innerAfterRun).toHaveBeenCalledTimes(1)
    expect(innerAfterRun.mock.calls[0]?.[0]?.notified).toBe(true)
    expect(outerAfterRun).toHaveBeenCalledTimes(1)
    expect(outerAfterRun.mock.calls[0]?.[0]?.notified).toBe(false)
  })

  it('runWithErrorChannelThrow 在 sync 场景会同步抛错', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const error = new Error('sync runner crash')
    const beforeRun = vi.fn()
    const afterRun = vi.fn<ErrorAfterHook>()

    expect(() => {
      runThrowing(
        () => {
          throw error
        },
        {
          origin: errorContexts.effectRunner,
          handlerPhase: errorPhases.sync,
          beforeRun,
          afterRun,
        },
      )
    }).toThrow(error)

    expect(beforeRun).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)

    const token = afterRun.mock.calls[0]?.[0]

    expect(token?.error).toBe(error)
    expect(token?.notified).toBe(true)
  })

  it('runThrowing 会把 primitive 包装成 Error 并同步抛出', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    try {
      runThrowing(
        () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'boom'
        },
        {
          origin: errorContexts.effectRunner,
          handlerPhase: errorPhases.sync,
        },
      )

      throw new Error('unreachable')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)

      expect((error as Error).message).toBe('boom')
      expect((error as Error & { cause: unknown }).cause).toBe('boom')
    }

    expect(handler).toHaveBeenCalledTimes(1)
    const [error] = handler.mock.calls[0]

    expect(error).toBeInstanceOf(Error)
    expect((error as Error & { cause: unknown }).cause).toBe('boom')
  })

  it('beforeRun 抛错也会触发错误通道且执行 afterRun', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const error = new Error('before hook crash')
    const runner = vi.fn<() => void>()
    const afterRun = vi.fn<ErrorAfterHook>()

    const invoke = () => {
      runSilent(runner, {
        origin: errorContexts.effectRunner,
        handlerPhase: errorPhases.sync,
        beforeRun() {
          throw error
        },
        afterRun,
      })
    }

    expect(invoke).not.toThrow()
    expect(runner).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)

    const token = afterRun.mock.calls[0]?.[0]

    expect(afterRun).toHaveBeenCalledTimes(1)
    expect(token?.error).toBe(error)
    expect(token?.notified).toBe(true)
  })

  it('runThrowing 会拒绝 Promise runner 并给出明确错误', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const afterRun = vi.fn<ErrorAfterHook>()

    expect(() => {
      void runThrowing(
        async () => {
          return 1
        },
        {
          origin: errorContexts.effectRunner,
          handlerPhase: errorPhases.sync,
          afterRun,
        },
      )
    }).toThrowError(sharedRunnerNoPromise)

    expect(handler).toHaveBeenCalledTimes(1)

    const [, context, payload] = handler.mock.calls[0]
    const token = afterRun.mock.calls[0]?.[0]

    expect(token).toBeDefined()
    const ensuredToken = token!

    expect(context).toBe(errorContexts.effectRunner)
    expect(ensuredToken.error).toBeInstanceOf(TypeError)
    expect(ensuredToken.error.message).toBe(sharedRunnerNoPromise)
    expect(payload?.token).toBe(ensuredToken)
    expect(ensuredToken.notified).toBe(true)
  })

  it('runWithErrorChannel 在成功时会透传返回值并执行钩子', () => {
    const beforeRun = vi.fn()
    const afterRun = vi.fn<ErrorAfterHook>()

    const expected = Symbol('ok')

    const result = runThrowing(
      () => {
        return expected
      },
      {
        origin: errorContexts.effectRunner,
        handlerPhase: errorPhases.sync,
        beforeRun,
        afterRun,
      },
    )

    expect(result).toBe(expected)
    expect(beforeRun).toHaveBeenCalledTimes(1)
    expect(afterRun).toHaveBeenCalledTimes(1)
    expect(afterRun.mock.calls[0]?.[0]).toBeUndefined()

    const silentBefore = vi.fn()
    const silentAfter = vi.fn<ErrorAfterHook>()

    const silentResult = runSilent(
      () => {
        return 1
      },
      {
        origin: errorContexts.scheduler,
        handlerPhase: errorPhases.sync,
        beforeRun: silentBefore,
        afterRun: silentAfter,
      },
    )

    expect(silentResult).toBe(1)
    expect(silentBefore).toHaveBeenCalledTimes(1)
    expect(silentAfter).toHaveBeenCalledTimes(1)
    expect(silentAfter.mock.calls[0]?.[0]).toBeUndefined()
  })

  it('runWithErrorChannelSilent 会吃掉异常但仍会通知处理器', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const error = new Error('silent runner crash')

    const throwCleanupError = (): never => {
      throw error
    }

    const invokeSilentChannel = () => {
      runSilent<never>(throwCleanupError, {
        origin: errorContexts.componentCleanup,
        handlerPhase: errorPhases.sync,
      })
    }

    expect(invokeSilentChannel).not.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)

    const [, context, payload] = handler.mock.calls[0]

    expect(context).toBe(errorContexts.componentCleanup)
    expect(payload?.token?.error).toBe(error)
    expect(payload?.token?.notified).toBe(true)
  })

  it('runSilent 会把 primitive 包装成 Error 并通知 handler', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    expect(() => {
      runSilent(
        () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 1
        },
        {
          origin: errorContexts.scheduler,
          handlerPhase: errorPhases.sync,
        },
      )
    }).not.toThrow()

    expect(handler).toHaveBeenCalledTimes(1)

    const [error] = handler.mock.calls[0]

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('1')
    expect((error as Error & { cause: unknown }).cause).toBe(1)
  })

  it('handler 未注册且 handlerPhase 为 async 时会异步抛错', () => {
    const error = new Error('async scheduler crash')
    const { callbacks, queueMicrotask } = stubGlobalQueueMicrotask()

    expect(() => {
      runSilent(
        () => {
          throw error
        },
        {
          origin: errorContexts.scheduler,
          handlerPhase: errorPhases.async,
        },
      )
    }).not.toThrow()

    expect(queueMicrotask).toHaveBeenCalledTimes(2)
    expect(callbacks).toHaveLength(2)

    const queuedCallback = callbacks.at(-1)!

    expect(queuedCallback).toThrow(error)
  })
})
