import { describe, expect, it } from 'vitest'
import { reactive } from '@/index.ts'

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
    proxy.nested.value = 5
    expect(raw.nested.value).toBe(5)
  })

  it('非对象值保持原样', () => {
    const value = 1

    expect(reactive(value)).toBe(value)
  })

  it('数组输入会给出明确错误提示', () => {
    const array: unknown = []

    expect(() => {
      return reactive(array)
    }).toThrowError(new TypeError('reactive 目前仅支持普通对象（不含数组）'))
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
      }).toThrowError(new TypeError('reactive 目前仅支持普通对象（不含数组）'))
    }
  })
})
