import { describe, expect, it } from 'vitest'
import { effect, reactive } from '@/index.ts'
import { arrayUntrackedMutators, isArrayMutatorKey } from '@/reactivity/index.ts'

describe('reactivity - array mutators', () => {
  it('暴露了预期的无追踪 mutator 方法', () => {
    const expected = [
      'push',
      'pop',
      'shift',
      'unshift',
      'splice',
      'sort',
      'reverse',
      'copyWithin',
      'fill',
    ] as const satisfies ReadonlyArray<keyof typeof arrayUntrackedMutators>

    for (const key of expected) {
      expect(isArrayMutatorKey(key)).toBe(true)
      /* 对应导出的表里应有函数实现 */
      expect(typeof arrayUntrackedMutators[key]).toBe('function')
    }
  })

  it('在 effect 执行体内调用 mutator 不会导致 effect 被重复收集（避免自触发）', () => {
    const array = reactive([1])

    let runs = 0

    effect(() => {
      runs += 1

      // 第一次执行时触发一次 mutator 调用；若 mutator 内部误触发依赖收集，
      // 会导致当前 effect 被收集并在本次写入后立即重新执行，从而 runs 增大。
      if (runs === 1) {
        array.push(2)
      }
    })

    expect(runs).toBe(1)
  })
})
