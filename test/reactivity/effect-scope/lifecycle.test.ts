import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EffectScope, ErrorHandler } from '@/index.ts'
import {
  computed,
  effect,
  effectScope,
  onScopeDispose,
  reactive,
  setErrorHandler,
} from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('effectScope 生命周期与清理', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('effectScope 停止后会级联停止内部 effect', () => {
    const state = reactive({ count: 0 })
    const scope = effectScope()
    let observed = -1

    scope.run(function runScope() {
      effect(function trackScope() {
        observed = state.count
      })
    })

    expect(observed).toBe(0)

    state.count = 1
    expect(observed).toBe(1)

    scope.stop()

    state.count = 2
    expect(observed).toBe(1)
  })

  it('effectScope 停止会同步清理 computed 派生值', () => {
    const scope = effectScope()
    const state = reactive({ count: 0 })
    const observed: number[] = []

    scope.run(function runComputed() {
      const doubled = computed(function getDoubled() {
        return state.count * 2
      })

      effect(function trackDoubled() {
        observed.push(doubled.value)
      })
    })

    expect(observed).toEqual([0])

    state.count = 1
    expect(observed).toEqual([0, 2])

    scope.stop()

    state.count = 2
    expect(observed).toEqual([0, 2])
  })

  it('effectScope 停止时 cleanup 抛错不会阻断剩余任务', () => {
    const scope = effectScope()
    const handler = vi.fn<ErrorHandler>()
    const cleanupOrder: string[] = []

    setErrorHandler(handler)

    scope.run(function registerCleanups() {
      onScopeDispose(function cleanupFirst() {
        cleanupOrder.push('first')
        throw new Error('scope cleanup failed')
      })

      onScopeDispose(function cleanupSecond() {
        cleanupOrder.push('second')
      })
    })

    scope.stop()

    expect(cleanupOrder).toEqual(['first', 'second'])
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error.message).toBe('scope cleanup failed')
    expect(context).toBe(errorContexts.effectScopeCleanup)
  })

  it('effectScope.run 抛错会触发错误处理器', () => {
    const scope = effectScope()
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('scope failed')

    setErrorHandler(handler)

    expect(() => {
      scope.run(function scopeThrows() {
        throw boom
      })
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.effectScopeRun)
  })

  it('子 scope 停止后不会破坏剩余子 scope 的生命周期管理', () => {
    const state = reactive({ count: 0 })
    const parent = effectScope()
    let first!: EffectScope
    let second!: EffectScope
    let third!: EffectScope
    const firstValues: number[] = []
    const secondValues: number[] = []
    const thirdValues: number[] = []

    parent.run(function createChildren() {
      first = effectScope()
      second = effectScope()

      first.run(function registerFirstEffect() {
        effect(function trackFirstEffect() {
          firstValues.push(state.count)
        })
      })

      second.run(function registerSecondEffect() {
        effect(function trackSecondEffect() {
          secondValues.push(state.count)
        })
      })
    })

    expect(firstValues).toEqual([0])
    expect(secondValues).toEqual([0])

    state.count = 1

    expect(firstValues).toEqual([0, 1])
    expect(secondValues).toEqual([0, 1])

    first.stop()

    parent.run(function createThirdChild() {
      third = effectScope()

      third.run(function registerThirdEffect() {
        effect(function trackThirdEffect() {
          thirdValues.push(state.count)
        })
      })
    })

    expect(thirdValues).toEqual([1])

    state.count = 2

    expect(firstValues).toEqual([0, 1])
    expect(secondValues).toEqual([0, 1, 2])
    expect(thirdValues).toEqual([1, 2])

    second.stop()

    state.count = 3

    expect(secondValues).toEqual([0, 1, 2])
    expect(thirdValues).toEqual([1, 2, 3])

    parent.stop()

    state.count = 4

    expect(thirdValues).toEqual([1, 2, 3])
  })

  it('detached scope 不受父级 stop 影响且可单独清理', () => {
    const state = reactive({ count: 0 })
    const parent = effectScope()
    const detached = effectScope(true)
    let fromParent = -1
    let fromDetached = -1

    parent.run(function parentScope() {
      effect(function trackParent() {
        fromParent = state.count
      })
    })

    detached.run(function detachedScope() {
      effect(function trackDetached() {
        fromDetached = state.count
      })
    })

    expect(fromParent).toBe(0)
    expect(fromDetached).toBe(0)

    parent.stop()

    state.count = 1

    expect(fromParent).toBe(0)
    expect(fromDetached).toBe(1)

    detached.stop()

    state.count = 2

    expect(fromParent).toBe(0)
    expect(fromDetached).toBe(1)
  })
})
