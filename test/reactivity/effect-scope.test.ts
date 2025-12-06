import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeErrorHandler } from '@/index.ts'
import {
  computed,
  effect,
  effectScope,
  onScopeDispose,
  reactive,
  setRuntimeErrorHandler,
} from '@/index.ts'
import { runtimeErrorContexts } from '@/shared/index.ts'

describe('effectScope 行为', () => {
  afterEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  it('effectScope 停止后会级联停止内部 effect', () => {
    const state = reactive({ count: 0 })
    const scope = effectScope()
    let observed = -1

    scope.run(() => {
      effect(() => {
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

    scope.run(() => {
      const doubled = computed(() => {
        return state.count * 2
      })

      effect(() => {
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
    const handler = vi.fn<RuntimeErrorHandler>()
    const cleanupOrder: string[] = []

    setRuntimeErrorHandler(handler)

    scope.run(() => {
      onScopeDispose(() => {
        cleanupOrder.push('first')
        throw new Error('scope cleanup failed')
      })

      onScopeDispose(() => {
        cleanupOrder.push('second')
      })
    })

    scope.stop()

    expect(cleanupOrder).toEqual(['first', 'second'])
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('scope cleanup failed')
    expect(context).toBe(runtimeErrorContexts.effectScopeCleanup)
  })

  it('effectScope.run 抛错会触发错误处理器', () => {
    const scope = effectScope()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('scope failed')

    setRuntimeErrorHandler(handler)

    expect(() => {
      scope.run(() => {
        throw boom
      })
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectScopeRun)
  })
})
