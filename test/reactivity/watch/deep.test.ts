import { describe, expect, it, vi } from 'vitest'
import type { WatchCallback } from '@/index.ts'
import { createWatch, reactive, ref } from '@/index.ts'

describe('watch - deep 行为', () => {
  it('默认对 reactive 对象执行深度侦听', () => {
    const state = reactive({ nested: { value: 0 } })
    const spy = vi.fn()

    createWatch(state, function onNested() {
      spy(state.nested.value)
    })

    state.nested.value = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('对 ref 启用深度模式可追踪内部字段', () => {
    const state = ref({ nested: { value: 0 } })
    const spy = vi.fn()

    createWatch(
      state,
      function onNested() {
        spy(state.value.nested.value)
      },
      { deep: true },
    )

    state.value.nested.value = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('对 getter 启用深度模式可追踪返回值内部字段', () => {
    const state = reactive({ nested: { value: 0 } })
    const spy = vi.fn()

    createWatch(
      function readNested() {
        return state.nested
      },
      function onChange(newValue) {
        spy(newValue.value)
      },
      { deep: true },
    )

    state.nested.value = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('深度 watch 可追踪 Symbol 属性', () => {
    const secret = Symbol('secret')
    const state = reactive<Record<symbol, { value: number }>>({
      [secret]: { value: 0 },
    })
    const spy = vi.fn()

    createWatch(
      state,
      function onSymbol() {
        spy(state[secret].value)
      },
      { deep: true },
    )

    state[secret].value = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('deep: false 可覆盖 reactive 默认深度侦听', () => {
    const state = reactive({ nested: { value: 0 } })

    type Nested = (typeof state)['nested']

    type WatchArgs = Parameters<WatchCallback<Nested>>

    interface ChangePayload {
      newValue: WatchArgs[0]
      oldValue: WatchArgs[1]
    }

    const spy = vi.fn<(payload: ChangePayload) => void>()

    createWatch<Nested>(
      function readNested() {
        return state.nested
      },
      function onChange(newValue, oldValue) {
        spy({ newValue, oldValue })
      },
      { deep: false },
    )

    state.nested.value = 1
    expect(spy).toHaveBeenCalledTimes(0)

    state.nested = { value: 2 }
    expect(spy).toHaveBeenCalledTimes(1)

    const [{ newValue, oldValue }] = spy.mock.calls[0]

    expect(newValue).toEqual({ value: 2 })
    expect(oldValue).toEqual({ value: 1 })
  })

  it('watch reactive 源显式 deep: false 仍能追踪顶层字段变更', () => {
    const state = reactive({ nested: { value: 0 }, count: 0 })
    const spy = vi.fn<(payload: { sameRef: boolean }) => void>()

    createWatch(
      state,
      function onChange(newValue, oldValue) {
        spy({ sameRef: newValue === oldValue })
      },
      { deep: false },
    )

    state.nested.value = 1
    expect(spy).toHaveBeenCalledTimes(0)

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith({ sameRef: true })

    state.nested = { value: 2 }
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
