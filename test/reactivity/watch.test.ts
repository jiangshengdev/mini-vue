import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeErrorHandler } from '@/index.ts'
import { reactive, ref, setRuntimeErrorHandler, watch } from '@/index.ts'
import { runtimeErrorContexts } from '@/shared/runtime-error-channel.ts'

describe('watch', () => {
  afterEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  it('默认懒执行并在源变化后触发回调', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      () => {
        return state.count
      },
      (newValue, oldValue) => {
        spy({
          newValue,
          oldValue,
        })
      },
    )

    expect(spy).not.toHaveBeenCalled()

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith({ newValue: 1, oldValue: 0 })

    state.count = 5
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith({ newValue: 5, oldValue: 1 })
  })

  it('immediate 选项会立刻执行一次回调', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      () => {
        return state.count
      },
      (newValue, oldValue) => {
        spy({
          newValue,
          oldValue,
        })
      },
      { immediate: true },
    )

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith({ newValue: 0, oldValue: undefined })

    state.count = 2
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith({ newValue: 2, oldValue: 0 })
  })

  it('返回的 stop 句柄可终止后续回调', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    const stop = watch(
      () => {
        return state.count
      },
      (newValue, oldValue) => {
        spy({ newValue, oldValue })
      },
    )

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(1)

    stop()

    state.count = 2
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('默认对 reactive 对象执行深度侦听', () => {
    const state = reactive({ nested: { value: 0 } })
    const spy = vi.fn()

    watch(state, () => {
      spy(state.nested.value)
    })

    state.nested.value = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('在下一次执行前会运行注册的 cleanup', () => {
    const state = reactive({ count: 0 })
    const cleanups: number[] = []

    watch(
      () => {
        return state.count
      },
      (newValue, _oldValue, onCleanup) => {
        onCleanup(() => {
          cleanups.push(newValue)
        })
      },
    )

    state.count = 1
    expect(cleanups).toEqual([])

    state.count = 2
    expect(cleanups).toEqual([1])
  })

  it('对 ref 启用深度模式可追踪内部字段', () => {
    const state = ref({ nested: { value: 0 } })
    const spy = vi.fn()

    watch(
      state,
      () => {
        spy(state.value.nested.value)
      },
      { deep: true },
    )

    state.value.nested.value = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('回调抛错后仍会更新旧值并执行 cleanup', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()
    const cleanupSpy = vi.fn()
    const boom = new Error('boom')
    const handler = vi.fn<RuntimeErrorHandler>()

    setRuntimeErrorHandler(handler)

    watch(
      () => {
        return state.count
      },
      (newValue, oldValue, onCleanup) => {
        onCleanup(() => {
          cleanupSpy(oldValue)
        })

        if (newValue === 1) {
          throw boom
        }

        spy({ newValue, oldValue })
      },
    )

    state.count = 1
    expect(handler).toHaveBeenCalledTimes(1)

    state.count = 2
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith({ newValue: 2, oldValue: 1 })
    expect(cleanupSpy).toHaveBeenCalledTimes(1)
    expect(cleanupSpy).toHaveBeenLastCalledWith(0)
  })

  it('回调抛错时会通知错误处理器', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('callback failed')

    setRuntimeErrorHandler(handler)

    watch(
      () => {
        return state.count
      },
      () => {
        throw boom
      },
    )

    state.count = 1
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.watchCallback)
  })

  it('cleanup 抛错会被错误处理器捕获且不影响后续流程', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<RuntimeErrorHandler>()
    const cleanupOrder: number[] = []
    const stopSpy = vi.fn()

    setRuntimeErrorHandler(handler)

    const stop = watch(
      () => {
        return state.count
      },
      (newValue, _oldValue, onCleanup) => {
        onCleanup(() => {
          cleanupOrder.push(newValue)
          throw new Error(`cleanup failed: ${newValue}`)
        })
        stopSpy(newValue)
      },
      { immediate: true },
    )

    expect(stopSpy).toHaveBeenCalledTimes(1)

    state.count = 1
    expect(stopSpy).toHaveBeenCalledTimes(2)
    expect(cleanupOrder).toEqual([0])
    expect(handler).toHaveBeenCalledTimes(1)
    let [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('cleanup failed: 0')
    expect(context).toBe(runtimeErrorContexts.watchCleanup)

    state.count = 2
    expect(stopSpy).toHaveBeenCalledTimes(3)
    expect(cleanupOrder).toEqual([0, 1])
    expect(handler).toHaveBeenCalledTimes(2)
    ;[error, context] = handler.mock.calls[1]
    expect((error as Error).message).toBe('cleanup failed: 1')
    expect(context).toBe(runtimeErrorContexts.watchCleanup)

    stop()
    expect(stopSpy).toHaveBeenCalledTimes(3)
    expect(cleanupOrder).toEqual([0, 1, 2])
    expect(handler).toHaveBeenCalledTimes(3)
    ;[error, context] = handler.mock.calls[2]
    expect((error as Error).message).toBe('cleanup failed: 2')
    expect(context).toBe(runtimeErrorContexts.watchCleanup)
  })
})
