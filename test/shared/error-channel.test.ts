import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ErrorHandler } from '@/index.ts'
import { setErrorHandler } from '@/index.ts'
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

  it('runThrowing 会拒绝 Promise runner 并给出明确错误', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const afterRun = vi.fn<ErrorAfterHook>()

    expect(() => {
      runThrowing(
        () => Promise.resolve(1),
        {
          origin: errorContexts.effectRunner,
          handlerPhase: errorPhases.sync,
          afterRun,
        },
      )
    }).toThrowError(/Promise/)

    expect(handler).toHaveBeenCalledTimes(1)

    const [, context, payload] = handler.mock.calls[0]
    const token = afterRun.mock.calls[0]?.[0]

    expect(context).toBe(errorContexts.effectRunner)
    expect(token?.error).toBeInstanceOf(TypeError)
    expect((token?.error as Error).message).toContain('Promise')
    expect(payload?.token).toBe(token)
    expect(token?.notified).toBe(true)
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

  it('handler 未注册且 handlerPhase 为 async 时会异步抛错', () => {
    const error = new Error('async scheduler crash')
    const originalQueueMicrotask = globalThis.queueMicrotask
    const callbacks: Array<() => void> = []
    const queueSpy = vi.fn<(callback: () => void) => void>((callback) => {
      callbacks.push(callback)
    })

    ;(
      globalThis as typeof globalThis & {
        queueMicrotask: (callback: () => void) => void
      }
    ).queueMicrotask = queueSpy

    try {
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

      expect(queueSpy).toHaveBeenCalledTimes(1)
      expect(callbacks).toHaveLength(1)
      const queuedCallback = callbacks[0]

      expect(queuedCallback).toThrow(error)
    } finally {
      ;(
        globalThis as typeof globalThis & {
          queueMicrotask: (callback: () => void) => void
        }
      ).queueMicrotask = originalQueueMicrotask
    }
  })
})
