import { describe, expect, it, vi } from 'vitest'
import { reactive, ref, watch } from '@/index.ts'

describe('watch - 基础行为', () => {
  it('默认懒执行并在源变化后触发回调', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      function readCount() {
        return state.count
      },
      function onChange(newValue, oldValue) {
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
      function readCount() {
        return state.count
      },
      function onChange(newValue, oldValue) {
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
      function readCount() {
        return state.count
      },
      function onChange(newValue, oldValue) {
        spy({ newValue, oldValue })
      },
    )

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(1)

    stop()

    state.count = 2
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('浅 watch 在值未变化时跳过回调', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      function readParity() {
        return state.count % 2
      },
      function onChange(newValue, oldValue, onCleanup) {
        void onCleanup
        spy({ newValue, oldValue })
      },
    )

    state.count = 2
    state.count = 4
    expect(spy).toHaveBeenCalledTimes(0)

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith({ newValue: 1, oldValue: 0 })
  })

  it('ref 默认浅侦听：仅 value 替换触发', () => {
    const state = ref({ nested: { value: 0 } })
    const spy = vi.fn()

    watch(state, function onChange() {
      spy(state.value.nested.value)
    })

    state.value.nested.value = 1
    expect(spy).toHaveBeenCalledTimes(0)

    state.value = { nested: { value: 2 } }
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(2)
  })
})
