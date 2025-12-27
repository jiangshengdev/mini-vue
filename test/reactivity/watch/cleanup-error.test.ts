import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ErrorHandler } from '@/index.ts'
import { createWatch, reactive, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('watch - cleanup 与错误', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('在下一次执行前会运行注册的 cleanup', () => {
    const state = reactive({ count: 0 })
    const cleanups: number[] = []

    createWatch(
      function readCount() {
        return state.count
      },
      function onChange(newValue, _oldValue, onCleanup) {
        onCleanup(function pushCleanup() {
          cleanups.push(newValue)
        })
      },
    )

    state.count = 1
    expect(cleanups).toEqual([])

    state.count = 2
    expect(cleanups).toEqual([1])
  })

  it('回调抛错后仍会更新旧值并执行 cleanup', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()
    const cleanupSpy = vi.fn()
    const boom = new Error('boom')
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    createWatch(
      function readCount() {
        return state.count
      },
      function onChange(newValue, oldValue, onCleanup) {
        onCleanup(function cleanupPrevious() {
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
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('callback failed')

    setErrorHandler(handler)

    createWatch(
      function readCount() {
        return state.count
      },
      function throwInCallback() {
        throw boom
      },
    )

    state.count = 1
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.watchCallback)
  })

  it('cleanup 抛错会被错误处理器捕获且不影响后续流程', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<ErrorHandler>()
    const cleanupOrder: number[] = []
    const stopSpy = vi.fn()

    setErrorHandler(handler)

    const stop = createWatch(
      function readCount() {
        return state.count
      },
      function onChange(newValue, _oldValue, onCleanup) {
        onCleanup(function cleanupCount() {
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

    expect(error.message).toBe('cleanup failed: 0')
    expect(context).toBe(errorContexts.watchCleanup)

    state.count = 2
    expect(stopSpy).toHaveBeenCalledTimes(3)
    expect(cleanupOrder).toEqual([0, 1])
    expect(handler).toHaveBeenCalledTimes(2)
    ;[error, context] = handler.mock.calls[1]
    expect(error.message).toBe('cleanup failed: 1')
    expect(context).toBe(errorContexts.watchCleanup)

    stop()
    expect(stopSpy).toHaveBeenCalledTimes(3)
    expect(cleanupOrder).toEqual([0, 1, 2])
    expect(handler).toHaveBeenCalledTimes(3)
    ;[error, context] = handler.mock.calls[2]
    expect(error.message).toBe('cleanup failed: 2')
    expect(context).toBe(errorContexts.watchCleanup)
  })
})
