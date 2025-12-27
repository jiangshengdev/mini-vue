import { describe, expect, it, vi } from 'vitest'
import type { WatchCallback } from '@/index.ts'
import { createWatch, effect, effectScope, reactive } from '@/index.ts'

function registerCleanup<T>(
  onCleanup: Parameters<WatchCallback<T>>[2],
  cleanupSpy: (value: T) => void,
  value: T,
) {
  onCleanup(() => {
    cleanupSpy(value)
  })
}

describe('watch - 生命周期联动', () => {
  it('watch 在父 effect stop 时自动停止', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    const parent = effect(function parentEffect() {
      createWatch(
        function readCount() {
          return state.count
        },
        function onChange(newValue, oldValue) {
          spy({ newValue, oldValue })
        },
      )
    })

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith({ newValue: 1, oldValue: 0 })

    parent.stop()

    state.count = 2
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('watch 随 effectScope stop 停止并执行末次 cleanup', () => {
    const scope = effectScope()
    const state = reactive({ count: 0 })
    const cleanupSpy = vi.fn()
    const callbackSpy = vi.fn()

    scope.run(() => {
      createWatch(
        function readCount() {
          return state.count
        },
        function onChange(newValue, _oldValue, onCleanup) {
          registerCleanup(onCleanup, cleanupSpy, newValue)
          callbackSpy(newValue)
        },
        { immediate: true },
      )
    })

    expect(callbackSpy).toHaveBeenCalledTimes(1)

    scope.stop()

    expect(cleanupSpy).toHaveBeenCalledTimes(1)
    expect(cleanupSpy).toHaveBeenLastCalledWith(0)

    state.count = 1
    expect(callbackSpy).toHaveBeenCalledTimes(1)
  })
})
