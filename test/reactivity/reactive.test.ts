import type { MockInstance } from 'vitest'
import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest'
import { spyOnConsole } from '$/test-utils/mocks.ts'
import type { Ref } from '@/index.ts'
import { effect, isReactive, isReadonly, isRef, reactive, readonly, ref, toRaw } from '@/index.ts'
import { reactivityUnsupportedType } from '@/messages/index.ts'
import type { PlainObject } from '@/shared/index.ts'

describe('reactive', () => {
  it('创建后可读取和写入属性', () => {
    const raw = { foo: 1 }
    const proxy = reactive(raw)

    expect(proxy).not.toBe(raw)
    expect(proxy.foo).toBe(1)

    proxy.foo = 2
    expect(raw.foo).toBe(2)
  })

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

  it('原始对象修改会同步到代理', () => {
    const raw = { count: 1 }
    const proxy = reactive(raw)

    raw.count = 3
    expect(proxy.count).toBe(3)
  })

  it('嵌套对象会被懒惰代理', () => {
    const raw = { nested: { value: 1 } }
    const proxy = reactive(raw)

    expect(proxy.nested.value).toBe(1)
    expect(isReactive(proxy.nested)).toBe(true)
    proxy.nested.value = 5
    expect(raw.nested.value).toBe(5)
  })

  it('非对象值保持原样', () => {
    const value = 1

    expect(reactive(value)).toBe(value)
  })

  it('数组输入会被成功代理', () => {
    const raw: number[] = [0, 1]
    const proxy = reactive(raw)

    expect(proxy).not.toBe(raw)
    expect(proxy[0]).toBe(0)

    proxy[1] = 5
    expect(raw[1]).toBe(5)
  })

  it('嵌套数组元素会懒加载代理', () => {
    const raw = [{ count: 1 }]
    const proxy = reactive(raw) as Array<{ count: number }>

    expect(proxy[0].count).toBe(1)
    expect(isReactive(proxy[0])).toBe(true)

    proxy[0].count = 2
    expect(raw[0].count).toBe(2)
  })

  it('对象属性为 Ref 时会自动解包', () => {
    const count = ref(1)
    const state = reactive({ count })

    expect(state.count).toBe(1)

    expectTypeOf(state.count).toEqualTypeOf<number>()

    count.value = 2
    expect(state.count).toBe(2)
  })

  it('数组索引上的 Ref 不会被自动解包', () => {
    const list = reactive([ref(1)])

    expect(isRef(list[0])).toBe(true)
    expectTypeOf(list[0]).toEqualTypeOf<Ref<number>>()
  })

  it('同一数组重复代理保持幂等', () => {
    const raw = [1, 2]
    const proxy1 = reactive(raw)
    const proxy2 = reactive(raw)
    const wrapped = reactive(proxy1)

    expect(proxy1).toBe(proxy2)
    expect(wrapped).toBe(proxy1)
  })

  it('无原型对象可被视为普通对象代理', () => {
    const raw = Object.create(null) as PlainObject

    raw.count = 1

    const proxy = reactive(raw)

    proxy.count = 3
    expect(raw.count).toBe(3)
  })

  it('isReactive 对代理与原始值的判定', () => {
    const raw = { foo: 1 }
    const proxy = reactive(raw)
    const arrayProxy = reactive([1])

    expect(isReactive(proxy)).toBe(true)
    expect(isReactive(arrayProxy)).toBe(true)
    expect(isReactive(raw)).toBe(false)
    expect(isReactive(1)).toBe(false)
    expect(isReactive(new Map())).toBe(false)
  })

  it('toRaw 可还原 reactive 代理对应的原始对象', () => {
    const raw = { nested: { count: 1 } }
    const proxy = reactive(raw)

    expect(toRaw(proxy)).toBe(raw)
    expect(isReactive(toRaw(proxy))).toBe(false)
    expect(toRaw(raw)).toBe(raw)
  })

  it('reactive() 支持 Ref 目标（返回 Ref 本体）', () => {
    const source = ref(1)
    const proxy = reactive(source)

    expect(proxy).toBe(source)
    expect(isRef(proxy)).toBe(true)
    expect(proxy.value).toBe(1)

    proxy.value = 2
    expect(source.value).toBe(2)
  })

  it('非普通内建对象会报错', () => {
    const factories = [
      [
        'Map',
        () => {
          return new Map()
        },
      ],
      [
        'Set',
        () => {
          return new Set()
        },
      ],
      [
        'Date',
        () => {
          return new Date()
        },
      ],
    ] as const

    for (const [, factory] of factories) {
      const value: unknown = factory()

      expect(() => {
        return reactive(value)
      }).toThrowError(new TypeError(reactivityUnsupportedType))
    }
  })

  it('写入阶段读取旧值不会意外收集依赖', () => {
    const state = reactive({
      _v: 0,
      get v() {
        return this._v
      },
      set v(next: number) {
        this._v = next
      },
    })

    let runs = 0

    effect(function writeOnly() {
      runs += 1
      state.v = 1
    })

    expect(runs).toBe(1)

    /* 若 set 内部读旧值导致 getter 收集依赖，则这里会触发 writeOnly 重跑。 */
    state._v = 2
    expect(runs).toBe(1)
  })
})

describe('readonly', () => {
  let warn: MockInstance<Console['warn']>

  beforeEach(() => {
    warn = spyOnConsole('warn')
  })

  it('创建只读代理并阻止写入', () => {
    const raw = { foo: 1 }
    const proxy = readonly(raw)

    // @ts-expect-error 只读代理
    proxy.foo = 2

    expect(proxy.foo).toBe(1)
    expect(raw.foo).toBe(1)
  })

  it('深层对象同样保持只读', () => {
    const raw = { nested: { count: 1 } }
    const proxy = readonly(raw)

    // @ts-expect-error 只读代理
    proxy.nested.count = 2

    expect(raw.nested.count).toBe(1)
  })

  it('重复调用返回同一代理实例', () => {
    const raw = { foo: 1 }
    const proxy1 = readonly(raw)
    const proxy2 = readonly(raw)

    expect(proxy1).toBe(proxy2)
  })

  it('对只读代理再次调用保持幂等', () => {
    const proxy = readonly({ foo: 1 })
    const wrapped = readonly(proxy)

    expect(wrapped).toBe(proxy)
  })

  it('属性上的 Ref 会被解包', () => {
    const foo = ref(1)
    const proxy = readonly({ foo })

    expect(proxy.foo).toBe(1)
    expect(isRef(proxy.foo)).toBe(false)
  })

  it('数组与嵌套对象可正常读取且保持只读', () => {
    const raw = [{ count: 1 }]
    const proxy = readonly(raw)

    expect(proxy[0].count).toBe(1)

    // @ts-expect-error 只读代理
    proxy[0].count = 2
    expect(raw[0].count).toBe(1)
  })

  it('isReadonly 对代理与原始值的判定', () => {
    const raw = { foo: 1 }
    const proxy = readonly(raw)
    const reactiveProxy = reactive({ bar: 1 })

    expect(isReadonly(proxy)).toBe(true)
    expect(isReadonly(raw)).toBe(false)
    expect(isReadonly(reactiveProxy)).toBe(false)
  })

  it('只读代理被写入/删除时发出警告', () => {
    const proxy = readonly({ foo: 1 })

    // @ts-expect-error 只读代理
    proxy.foo = 2
    // @ts-expect-error 只读代理
    delete proxy.foo

    expect(warn).toHaveBeenCalled()
  })

  it('readonly 访问不会收集依赖（与 Vue 3 对齐）', () => {
    const raw: PlainObject = { foo: 1 }
    const readonlyState = readonly(raw)
    const reactiveState = reactive(raw)

    let runs = 0
    let dummy = 0

    effect(function trackReadonlyFoo() {
      runs += 1
      dummy = readonlyState.foo as number
    })

    expect(runs).toBe(1)
    expect(dummy).toBe(1)

    reactiveState.foo = 2

    expect(runs).toBe(1)
    expect(dummy).toBe(1)
    expect(readonlyState.foo).toBe(2)
  })

  it('readonly 的 in/Object.keys 不会收集依赖', () => {
    const raw: PlainObject = { foo: 1 }
    const readonlyState = readonly(raw)
    const reactiveState = reactive(raw)

    let inRuns = 0
    let hasBar = true

    effect(function trackReadonlyIn() {
      inRuns += 1
      hasBar = 'bar' in readonlyState
    })

    expect(inRuns).toBe(1)
    expect(hasBar).toBe(false)

    reactiveState.bar = 1

    expect(inRuns).toBe(1)
    expect(hasBar).toBe(false)
    expect('bar' in readonlyState).toBe(true)

    let keysRuns = 0
    let keys: string[] = []

    effect(function trackReadonlyKeys() {
      keysRuns += 1
      keys = Object.keys(readonlyState)
    })

    expect(keysRuns).toBe(1)
    expect(keys).toEqual(['foo', 'bar'])

    reactiveState.baz = 2

    expect(keysRuns).toBe(1)
    expect(keys).toEqual(['foo', 'bar'])
    expect(Object.keys(readonlyState)).toEqual(['foo', 'bar', 'baz'])
  })

  it('readonly 数组查询方法不会收集依赖', () => {
    const a = {}
    const b = {}
    const raw = [a]
    const readonlyList = readonly(raw)
    const reactiveList = reactive(raw)

    let runs = 0
    let observed = false

    effect(function trackReadonlyIncludes() {
      runs += 1
      observed = readonlyList.includes(a)
    })

    expect(runs).toBe(1)
    expect(observed).toBe(true)

    reactiveList[0] = b

    expect(runs).toBe(1)
    expect(observed).toBe(true)
    expect(readonlyList.includes(a)).toBe(false)
  })

  it('readonly() 支持 Ref 目标并返回只读 Ref', () => {
    const source = ref(1)
    const proxy = readonly(source)

    warn.mockClear()

    expect(isRef(proxy)).toBe(true)
    expect(proxy.value).toBe(1)

    proxy.value = 2

    expect(warn).toHaveBeenCalled()
    expect(proxy.value).toBe(1)
    expect(source.value).toBe(1)
    expect(readonly(proxy)).toBe(proxy)
  })

  it('readonly(ref(object)) 会对 value 返回只读视图', () => {
    const source = ref({ count: 1 })
    const proxy = readonly(source)

    warn.mockClear()

    expect(proxy.value.count).toBe(1)
    ;(proxy.value as { count: number }).count = 2

    expect(warn).toHaveBeenCalled()
    expect(proxy.value.count).toBe(1)
    expect(source.value.count).toBe(1)
  })
})
