import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ErrorHandler } from '@/index.ts'
import { computed, effect, ref, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('computed', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('懒执行并缓存计算结果', () => {
    const state = ref({ count: 0 })
    const getter = vi.fn(function getDouble() {
      return state.value.count * 2
    })

    getter.mockName('getDouble')
    const doubled = computed(getter)

    expect(getter).not.toHaveBeenCalled()

    expect(doubled.value).toBe(0)
    expect(getter).toHaveBeenCalledTimes(1)

    /* 二次读取命中缓存，不会重新执行 getter。 */
    expect(doubled.value).toBe(0)
    expect(getter).toHaveBeenCalledTimes(1)

    state.value.count = 1
    /* 未读取前不重新计算。 */
    expect(getter).toHaveBeenCalledTimes(1)

    expect(doubled.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)
  })

  it('可被 effect 追踪并在依赖变化后重新求值', () => {
    const state = ref(0)
    const plusOne = computed(function getPlusOne() {
      return state.value + 1
    })
    let observed = -1

    effect(function trackPlusOne() {
      observed = plusOne.value
    })

    expect(observed).toBe(1)

    state.value = 1
    expect(observed).toBe(2)
  })

  it('支持自定义 setter 将值映射回源数据', () => {
    const base = ref(1)
    const doubled = computed({
      get: function getDoubled() {
        return base.value * 2
      },
      set: function setFromDoubled(next) {
        base.value = next / 2
      },
    })

    expect(doubled.value).toBe(2)

    doubled.value = 10
    expect(base.value).toBe(5)
    expect(doubled.value).toBe(10)
  })

  it('只读 computed 赋值时抛错', () => {
    const readonlyComputed = computed(function getReadonly() {
      return 1
    })

    expect(() => {
      readonlyComputed.value = 2
    }).toThrow(TypeError)
  })

  it('支持链式 computed 共享脏标记', () => {
    const base = ref(1)
    const plusOne = computed(function getPlusOne() {
      return base.value + 1
    })
    const plusTwo = computed(function getPlusTwo() {
      return plusOne.value + 1
    })

    expect(plusTwo.value).toBe(3)

    base.value = 5
    expect(plusTwo.value).toBe(7)
  })

  it('setter 抛错时会同步抛出并通知错误处理器', () => {
    const handler = vi.fn<ErrorHandler>()
    const base = ref(0)
    const boom = new Error('setter failed')

    setErrorHandler(handler)

    const custom = computed({
      get: function getBase() {
        return base.value
      },
      set: function throwSetter() {
        throw boom
      },
    })

    expect(() => {
      custom.value = 1
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.computedSetter)
  })
})
