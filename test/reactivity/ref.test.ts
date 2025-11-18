import { describe, expect, expectTypeOf, it } from 'vitest'
import { effect, isRef, reactive, ref, toRef, unref } from '@/index.ts'

describe('ref', () => {
  it('基础读写并触发 effect', () => {
    const count = ref(0)
    let observed = -1

    effect(() => {
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

    effect(() => {
      dummy = state.value.count
    })

    expect(dummy).toBe(0)

    state.value.count = 2
    expect(dummy).toBe(2)
  })

  it('isRef/unref 辅助函数', () => {
    const numberRef = ref(1)

    expect(isRef(numberRef)).toBe(true)
    expect(isRef(1)).toBe(false)

    expect(unref(numberRef)).toBe(1)
    expect(unref(1)).toBe(1)
  })

  it('toRef 代理现有响应式属性', () => {
    const state = reactive({ count: 0 })
    const countRef = toRef(state, 'count')
    let observed = -1

    effect(() => {
      observed = countRef.value
    })

    expect(observed).toBe(0)

    state.count = 5
    expect(observed).toBe(5)

    countRef.value = 10
    expect(state.count).toBe(10)
    expect(observed).toBe(10)
  })

  it('toRef 在普通对象属性上维持自身依赖', () => {
    const state = { count: 1 }
    const countRef = toRef(state, 'count')
    let observed = -1
    let runs = 0

    effect(() => {
      runs += 1
      observed = countRef.value
    })

    expect(observed).toBe(1)
    expect(runs).toBe(1)

    countRef.value = 2
    expect(state.count).toBe(2)
    expect(observed).toBe(2)
    expect(runs).toBe(2)

    /* 直接修改原始对象不会触发 ref 的依赖。 */
    state.count = 3
    expect(observed).toBe(2)
    expect(runs).toBe(2)
  })

  it('toRef 在属性本身已为 ref 时直接复用', () => {
    const count = ref(0)
    const holder = { count }

    expect(toRef(holder, 'count')).toBe(count)
  })

  it('ref(refValue) 暴露出错误的嵌套类型提示', () => {
    const base = ref(1)
    const alias = ref(base)

    expect(alias).toBe(base)

    expectTypeOf(alias.value).toEqualTypeOf<number>()
  })
})
