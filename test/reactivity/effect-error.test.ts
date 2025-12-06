import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeErrorHandler } from '@/index.ts'
import { effect, reactive, setRuntimeErrorHandler } from '@/index.ts'
import { effectStack } from '@/reactivity/internals/index.ts'
import { runtimeErrorContexts } from '@/shared/index.ts'

describe('effect 错误处理', () => {
  afterEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  it('effect cleanup 抛错会通知错误处理器并继续执行剩余清理', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<RuntimeErrorHandler>()
    const cleanupOrder: string[] = []

    setRuntimeErrorHandler(handler)

    effect(() => {
      void state.count

      effectStack.current?.registerCleanup(() => {
        cleanupOrder.push('first')
        throw new Error('effect cleanup failed')
      })

      effectStack.current?.registerCleanup(() => {
        cleanupOrder.push('second')
      })
    })

    state.count = 1

    expect(cleanupOrder).toEqual(['first', 'second'])
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('effect cleanup failed')
    expect(context).toBe(runtimeErrorContexts.effectCleanup)
  })

  it('effect 抛错会通知错误处理器并保持原有抛出行为', () => {
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('effect failed')

    setRuntimeErrorHandler(handler)

    expect(() => {
      effect(() => {
        throw boom
      })
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectRunner)
  })

  it('停止后的 effect 重新执行抛错也会触发错误处理', () => {
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('stopped effect failed')
    let shouldThrow = false

    setRuntimeErrorHandler(handler)

    const handle = effect(() => {
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
    expect(context).toBe(runtimeErrorContexts.effectRunner)
  })
})
