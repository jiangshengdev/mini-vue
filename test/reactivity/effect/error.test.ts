import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ErrorHandler } from '@/index.ts'
import { effect, reactive, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'
import { effectStack } from '@/reactivity/index.ts'

describe('effect 错误处理', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('effect cleanup 抛错会通知错误处理器并继续执行剩余清理', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<ErrorHandler>()
    const cleanupOrder: string[] = []

    setErrorHandler(handler)

    effect(function cleanupErrorEffect() {
      void state.count

      effectStack.current?.registerCleanup(function cleanupFirst() {
        cleanupOrder.push('first')
        throw new Error('effect cleanup failed')
      })

      effectStack.current?.registerCleanup(function cleanupSecond() {
        cleanupOrder.push('second')
      })
    })

    state.count = 1

    expect(cleanupOrder).toEqual(['first', 'second'])
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error.message).toBe('effect cleanup failed')
    expect(context).toBe(errorContexts.effectCleanup)
  })

  it('effect 抛错会通知错误处理器并保持原有抛出行为', () => {
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('effect failed')

    setErrorHandler(handler)

    expect(() => {
      effect(function throwingEffect() {
        throw boom
      })
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.effectRunner)
  })

  it('停止后的 effect 重新执行抛错也会触发错误处理', () => {
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('stopped effect failed')
    let shouldThrow = false

    setErrorHandler(handler)

    const handle = effect(function maybeThrowEffect() {
      if (shouldThrow) {
        throw boom
      }
    })

    handle.stop()
    shouldThrow = true

    expect(() => {
      handle.run()
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.effectRunner)
  })

  it('effect 抛错后仍能继续收集新依赖', () => {
    const state = reactive({ count: 0 })

    expect(() => {
      effect(function throwingEffect() {
        throw new Error('boom')
      })
    }).toThrowError()

    let observed = -1

    effect(function collectAfterError() {
      observed = state.count
    })

    expect(observed).toBe(0)

    state.count = 1

    expect(observed).toBe(1)
  })
})
