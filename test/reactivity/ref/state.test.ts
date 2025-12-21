import { describe, expect, expectTypeOf, it } from 'vitest'
import { effect, isRef, ref, state } from '@/index.ts'

describe('state', () => {
  it('get/set 读写并触发 effect', () => {
    const count = state(0)
    let observed = -1

    effect(function trackCount() {
      observed = count.get()
    })

    expect(observed).toBe(0)

    count.set(1)
    expect(observed).toBe(1)

    count.set(1)
    expect(observed).toBe(1)
  })

  it('保留 ref 语义（isRef 与 .value 访问）', () => {
    const count = state(1)

    expect(isRef(count)).toBe(true)
    expect(count.value).toBe(1)

    count.value = 2
    expect(count.get()).toBe(2)
  })

  it('对象值保持响应式，与 ref 行为一致', () => {
    const object = state({ count: 0 })
    let observed = -1

    effect(function trackNested() {
      observed = object.get().count
    })

    expect(observed).toBe(0)

    object.get().count = 2
    expect(observed).toBe(2)
  })

  it('state(refValue) 复用原 Ref 实例', () => {
    const base = ref(1)
    const alias = state(base)

    expect(alias).toBe(base)

    alias.set(2)
    expect(base.value).toBe(2)
  })

  it('类型保持一致', () => {
    const count = state(1)

    expectTypeOf(count.get()).toEqualTypeOf<number>()
    expectTypeOf(count.set).parameters.toEqualTypeOf<[number]>()
  })
})
