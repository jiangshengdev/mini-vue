import { describe, expect, it } from 'vitest'
import { computed, isRef, ref, unref } from '@/index.ts'

describe('ref/computed 互操作', () => {
  it('computed 也是 Ref：isRef/unref 可直接工作', () => {
    const base = ref(1)
    const doubled = computed(function getDoubled() {
      return base.value * 2
    })

    expect(isRef(doubled)).toBe(true)
    expect(unref(doubled)).toBe(2)

    base.value = 2
    expect(unref(doubled)).toBe(4)
  })
})
