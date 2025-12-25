import { describe, expect, it } from 'vitest'
import {
  isReactive,
  isReadonly,
  isRef,
  reactive,
  ref,
  shallowReactive,
  shallowReadonly,
} from '@/index.ts'
import { reactivityUnsupportedType } from '@/messages/index.ts'

describe('shallowReactive', () => {
  it('仅代理第一层，不递归嵌套对象', () => {
    const raw = { foo: 1, nested: { count: 1 } }
    const proxy = shallowReactive(raw)

    expect(proxy).not.toBe(raw)
    expect(proxy.nested).toBe(raw.nested)
    expect(isReactive(proxy)).toBe(true)
    expect(isReactive(proxy.nested)).toBe(false)

    proxy.nested.count = 2
    expect(raw.nested.count).toBe(2)
  })

  it('顶层 Ref 会解包，嵌套 Ref 保持原样', () => {
    const foo = ref(1)
    const bar = ref(2)
    const proxy = shallowReactive({
      foo,
      nested: { bar },
      list: [ref(3)],
    })

    expect(proxy.foo).toBe(1)
    expect(isRef(proxy.nested.bar)).toBe(true)
    expect(isRef(proxy.list[0])).toBe(true)
  })

  it('重复调用返回同一代理，对代理再次调用保持幂等', () => {
    const raw = { foo: 1 }
    const proxy1 = shallowReactive(raw)
    const proxy2 = shallowReactive(raw)
    const wrapped = shallowReactive(proxy1)

    expect(proxy1).toBe(proxy2)
    expect(wrapped).toBe(proxy1)
  })

  it('不支持的内建对象会报错', () => {
    const value: unknown = new Map()

    expect(() => {
      return shallowReactive(value)
    }).toThrowError(new TypeError(reactivityUnsupportedType))
  })
})

describe('shallowReadonly', () => {
  it('阻止写入且不解包 Ref', () => {
    const raw = { foo: 1, bar: ref(2) }
    const proxy = shallowReadonly(raw)

    // @ts-expect-error 只读代理
    proxy.foo = 3

    expect(raw.foo).toBe(1)
    expect(isRef(proxy.bar)).toBe(true)
  })

  it('可对 reactive 结果创建只读浅代理', () => {
    const state = reactive({ foo: 1 })
    const readonlyState = shallowReadonly(state)

    // @ts-expect-error 只读代理
    readonlyState.foo = 2

    expect(state.foo).toBe(1)
    expect(isReactive(readonlyState)).toBe(false)
  })

  it('对只读浅代理再次调用保持幂等', () => {
    const proxy = shallowReadonly({ foo: 1 })
    const wrapped = shallowReadonly(proxy)

    expect(wrapped).toBe(proxy)
  })

  it('isReadonly 识别 shallowReadonly 代理', () => {
    const proxy = shallowReadonly({ foo: 1 })

    expect(isReadonly(proxy)).toBe(true)
    expect(isReadonly({})).toBe(false)
  })
})
