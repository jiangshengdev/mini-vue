import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setRuntimeErrorHandler } from '@/index.ts'
import { dispatchRuntimeError, runWithErrorChannel } from '@/shared/runtime-error-channel.ts'

describe('runtime-error-channel', () => {
  beforeEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  afterEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  it('dispatchRuntimeError 只会上报一次相同的 error', () => {
    const handler = vi.fn()

    setRuntimeErrorHandler(handler)

    const error = new Error('component boom')

    const firstToken = dispatchRuntimeError(error, {
      origin: 'component-setup',
      handlerPhase: 'sync',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(firstToken.notified).toBe(true)

    const [, context, detail] = handler.mock.calls[0]!

    expect(context).toBe('component-setup')
    expect(detail?.token).toBe(firstToken)

    const secondToken = dispatchRuntimeError(error, {
      origin: 'effect-runner',
      handlerPhase: 'async',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(secondToken.notified).toBe(false)
  })

  it('嵌套 runWithErrorChannel 共享同一错误时只通知一次', () => {
    const handler = vi.fn()

    setRuntimeErrorHandler(handler)

    const error = new Error('nested crash')
    const outerAfterRun = vi.fn()
    const innerAfterRun = vi.fn()

    expect(() => {
      runWithErrorChannel(
        () => {
          runWithErrorChannel(
            () => {
              throw error
            },
            {
              origin: 'component-setup',
              handlerPhase: 'sync',
              propagate: 'sync',
              afterRun: innerAfterRun,
            },
          )
        },
        {
          origin: 'effect-scope-run',
          handlerPhase: 'sync',
          propagate: 'sync',
          afterRun: outerAfterRun,
        },
      )
    }).toThrow(error)

    expect(handler).toHaveBeenCalledTimes(1)

    const [, context, detail] = handler.mock.calls[0]!

    expect(context).toBe('component-setup')
    expect(detail?.token?.notified).toBe(true)

    expect(innerAfterRun).toHaveBeenCalledTimes(1)
    expect(innerAfterRun.mock.calls[0]?.[0]?.notified).toBe(true)
    expect(outerAfterRun).toHaveBeenCalledTimes(1)
    expect(outerAfterRun.mock.calls[0]?.[0]?.notified).toBe(false)
  })

  it('runWithErrorChannel 在 sync 场景会同步抛错', () => {
    const handler = vi.fn()

    setRuntimeErrorHandler(handler)

    const error = new Error('sync runner crash')
    const beforeRun = vi.fn()
    const afterRun = vi.fn()

    expect(() => {
      runWithErrorChannel(
        () => {
          throw error
        },
        {
          origin: 'effect-runner',
          handlerPhase: 'sync',
          propagate: 'sync',
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

  it('runWithErrorChannel 在 swallow 模式下会吃掉异常但仍会通知处理器', () => {
    const handler = vi.fn()

    setRuntimeErrorHandler(handler)

    const error = new Error('swallow runner crash')

    const result = runWithErrorChannel(
      () => {
        throw error
      },
      {
        origin: 'component-cleanup',
        handlerPhase: 'sync',
        propagate: 'swallow',
      },
    )

    expect(result).toBeUndefined()
    expect(handler).toHaveBeenCalledTimes(1)

    const [, context, detail] = handler.mock.calls[0]!

    expect(context).toBe('component-cleanup')
    expect(detail?.token?.error).toBe(error)
    expect(detail?.token?.notified).toBe(true)
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
        runWithErrorChannel(
          () => {
            throw error
          },
          {
            origin: 'scheduler',
            handlerPhase: 'async',
            propagate: 'swallow',
          },
        )
      }).not.toThrow()

      expect(queueSpy).toHaveBeenCalledTimes(1)
      expect(callbacks).toHaveLength(1)
      expect(() => {
        callbacks[0]!()
      }).toThrow(error)
    } finally {
      ;(
        globalThis as typeof globalThis & {
          queueMicrotask: (callback: () => void) => void
        }
      ).queueMicrotask = originalQueueMicrotask
    }
  })
})
