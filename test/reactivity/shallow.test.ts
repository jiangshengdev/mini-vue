import type { MockInstance } from 'vitest'
import { beforeEach, describe, expect, it } from 'vitest'
import { spyOnConsole } from '$/test-utils/mocks.ts'
import {
  effect,
  isReactive,
  isReadonly,
  isRef,
  reactive,
  ref,
  shallowReactive,
  shallowReadonly,
} from '@/index.ts'
import type { PlainObject } from '@/shared/index.ts'

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

  it('顶层 Ref 不会解包，嵌套 Ref 保持原样', () => {
    const foo = ref(1)
    const bar = ref(2)
    const proxy = shallowReactive({
      foo,
      nested: { bar },
      list: [ref(3)],
    })

    expect(isRef(proxy.foo)).toBe(true)
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

  it('shallowReactive() 支持 Ref 目标并返回代理', () => {
    const source = ref(1)
    const proxy = shallowReactive(source)

    expect(proxy).not.toBe(source)
    expect(isRef(proxy)).toBe(true)
    expect(proxy.value).toBe(1)

    proxy.value = 2
    expect(source.value).toBe(2)
  })

  it('不支持的内建对象会直接返回原值并告警', () => {
    const warn = spyOnConsole('warn')
    const value: unknown = new Map()
    const proxy = shallowReactive(value)

    expect(proxy).toBe(value)
    expect(warn).toHaveBeenCalled()
  })
})

describe('shallowReadonly', () => {
  let warn: MockInstance<Console['warn']>

  beforeEach(() => {
    warn = spyOnConsole('warn')
  })

  it('阻止写入且顶层 Ref 不解包', () => {
    const raw = { foo: 1, bar: ref(2), nested: { baz: ref(3) } }
    const proxy = shallowReadonly(raw)

    // @ts-expect-error 只读代理
    proxy.foo = 3

    expect(raw.foo).toBe(1)
    expect(isRef(proxy.bar)).toBe(true)
    expect(isRef(proxy.nested.baz)).toBe(true)
  })

  it('可对 reactive 结果创建只读浅代理', () => {
    const state = reactive({ foo: 1 })
    const readonlyState = shallowReadonly(state)

    // @ts-expect-error 只读代理
    readonlyState.foo = 2

    expect(state.foo).toBe(1)
    expect(isReactive(readonlyState)).toBe(true)
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

  it('shallowReadonly 访问不会收集依赖', () => {
    const raw: PlainObject = { foo: 1 }
    const readonlyState = shallowReadonly(raw)
    const reactiveState = reactive(raw)

    let runs = 0
    let dummy = 0

    effect(function trackShallowReadonlyFoo() {
      runs += 1
      dummy = readonlyState.foo as number
    })

    expect(runs).toBe(1)
    expect(dummy).toBe(1)

    reactiveState.foo = 2

    expect(runs).toBe(1)
    expect(dummy).toBe(1)
  })

  it('shallowReadonly() 支持 Ref 目标并返回只读代理', () => {
    const source = ref(1)
    const proxy = shallowReadonly(source)

    warn.mockClear()

    expect(isRef(proxy)).toBe(true)
    expect(proxy.value).toBe(1)
    ;(proxy as unknown as { value: number }).value = 2

    expect(warn).toHaveBeenCalled()
    expect(proxy.value).toBe(1)
    expect(source.value).toBe(1)
    expect(shallowReadonly(proxy)).toBe(proxy)
  })
})
