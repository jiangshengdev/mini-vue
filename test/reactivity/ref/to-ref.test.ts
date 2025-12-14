import { describe, expect, it } from 'vitest'
import { effect, reactive, ref, toRef } from '@/index.ts'

describe('toRef', () => {
  it('代理现有响应式属性', () => {
    const state = reactive({ count: 0 })
    const countRef = toRef(state, 'count')
    let observed = -1

    effect(function trackCountRef() {
      observed = countRef.value
    })

    expect(observed).toBe(0)

    state.count = 5
    expect(observed).toBe(5)

    countRef.value = 10
    expect(state.count).toBe(10)
    expect(observed).toBe(10)
  })

  it('在普通对象属性上维持自身依赖，并且读取永远透传当前值', () => {
    const state = { count: 1 }
    const countRef = toRef(state, 'count')
    let observed = -1
    let runs = 0

    effect(function trackPlainRef() {
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

    /* 但读取 ref 仍应拿到对象上的最新值（不缓存）。 */
    expect(countRef.value).toBe(3)
  })

  it('普通对象属性重复写入相同值不会触发依赖', () => {
    const state = { count: 1 }
    const countRef = toRef(state, 'count')
    let runs = 0

    effect(function trackPlainRef() {
      runs += 1
      void countRef.value
    })

    expect(runs).toBe(1)

    countRef.value = 1
    expect(state.count).toBe(1)
    expect(runs).toBe(1)
  })

  it('在属性本身已为 ref 时直接复用', () => {
    const count = ref(0)
    const holder = { count }

    expect(toRef(holder, 'count')).toBe(count)
  })

  it('creating a ref alias does not track the target property', () => {
    const state = reactive({ value: 1 })
    let runs = 0

    effect(function track() {
      runs += 1
      void toRef(state, 'value')
    })

    expect(runs).toBe(1)

    state.value = 2
    expect(runs).toBe(1)
  })
})
