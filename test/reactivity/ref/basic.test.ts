import { describe, expect, expectTypeOf, it } from 'vitest'
import { effect, isRef, reactive, ref, unref } from '@/index.ts'

describe('ref', () => {
  it('基础读写并触发 effect', () => {
    const count = ref(0)
    let observed = -1

    effect(function trackCount() {
      observed = count.value
    })

    expect(observed).toBe(0)

    count.value = 1
    expect(observed).toBe(1)

    count.value = 1
    expect(observed).toBe(1)
  })

  it('对象值会自动转为 reactive', () => {
    const state = ref({ count: 0 })
    let dummy = -1

    effect(function trackNested() {
      dummy = state.value.count
    })

    expect(dummy).toBe(0)

    state.value.count = 2
    expect(dummy).toBe(2)
  })

  it('数组值在 ref 中同样保持响应式', () => {
    const list = ref<number[]>([])
    let length = -1

    effect(function trackLength() {
      length = list.value.length
    })

    expect(length).toBe(0)

    list.value.push(1)
    expect(length).toBe(1)
  })

  it('isRef/unref 辅助函数', () => {
    const numberRef = ref(1)

    expect(isRef(numberRef)).toBe(true)
    expect(isRef(1)).toBe(false)

    expect(unref(numberRef)).toBe(1)
    expect(unref(1)).toBe(1)
  })

  it('对象 ref 写入同一引用不会触发 effect', () => {
    const raw = { count: 0 }
    const state = ref(raw)
    let runs = 0

    effect(function trackState() {
      runs += 1
      void state.value
    })

    expect(runs).toBe(1)

    state.value = raw
    expect(runs).toBe(1)
  })

  it('在原始对象与其代理之间切换不会重复触发 effect', () => {
    const raw = { count: 0 }
    const proxy = reactive(raw)
    const state = ref(raw)
    let runs = 0

    effect(function trackState() {
      runs += 1
      void state.value
    })

    expect(runs).toBe(1)

    state.value = proxy
    expect(runs).toBe(1)

    state.value = raw
    expect(runs).toBe(1)
  })

  it('ref(refValue) 暴露出错误的嵌套类型提示', () => {
    const base = ref(1)
    const alias = ref(base)

    expect(alias).toBe(base)

    expectTypeOf(alias.value).toEqualTypeOf<number>()
  })
})
