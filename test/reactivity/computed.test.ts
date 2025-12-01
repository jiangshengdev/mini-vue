import { describe, expect, it, vi } from 'vitest'
import { computed, effect, ref } from '@/index.ts'

describe('computed', () => {
  it('懒执行并缓存计算结果', () => {
    const state = ref({ count: 0 })
    const getter = vi.fn(() => {
      return state.value.count * 2
    })
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
    const plusOne = computed(() => {
      return state.value + 1
    })
    let observed = -1

    effect(() => {
      observed = plusOne.value
    })

    expect(observed).toBe(1)

    state.value = 1
    expect(observed).toBe(2)
  })

  it('支持自定义 setter 将值映射回源数据', () => {
    const base = ref(1)
    const doubled = computed({
      get() {
        return base.value * 2
      },
      set(next) {
        base.value = next / 2
      },
    })

    expect(doubled.value).toBe(2)

    doubled.value = 10
    expect(base.value).toBe(5)
    expect(doubled.value).toBe(10)
  })

  it('只读 computed 赋值时抛错', () => {
    const readonlyComputed = computed(() => {
      return 1
    })

    expect(() => {
      readonlyComputed.value = 2
    }).toThrow(TypeError)
  })

  it('支持链式 computed 共享脏标记', () => {
    const base = ref(1)
    const plusOne = computed(() => {
      return base.value + 1
    })
    const plusTwo = computed(() => {
      return plusOne.value + 1
    })

    expect(plusTwo.value).toBe(3)

    base.value = 5
    expect(plusTwo.value).toBe(7)
  })
})
