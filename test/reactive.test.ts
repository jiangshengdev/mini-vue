import { describe, expect, it } from 'vitest'
import { reactive } from '../src/reactivity/reactive.ts'

describe('reactive', () => {
  it('重复调用返回同一代理实例', () => {
    const raw = { foo: 1 }
    const proxy1 = reactive(raw)
    const proxy2 = reactive(raw)
    expect(proxy1).toBe(proxy2)
  })

  it('对代理再次调用保持幂等', () => {
    const proxy = reactive({ foo: 1 })
    const wrapped = reactive(proxy)
    expect(wrapped).toBe(proxy)
  })

  it('读写会影响原始对象', () => {
    const raw = { count: 1 }
    const proxy = reactive(raw)
    proxy.count = 2
    expect(raw.count).toBe(2)
  })

  it('嵌套对象会被懒惰代理', () => {
    const raw = { nested: { value: 1 } }
    const proxy = reactive(raw)
    expect(proxy.nested.value).toBe(1)
    proxy.nested.value = 5
    expect(raw.nested.value).toBe(5)
  })

  it('非对象值保持原样', () => {
    const value = 1
    expect(reactive(value as unknown as object)).toBe(value)
  })
})
