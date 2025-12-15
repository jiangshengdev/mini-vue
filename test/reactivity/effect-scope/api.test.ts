import { describe, expect, it, vi } from 'vitest'
import { effect, effectScope, getCurrentScope, reactive } from '@/index.ts'
import { ReactiveEffect, recordEffectScope, recordScopeCleanup } from '@/reactivity/index.ts'

describe('effectScope API 与作用域栈', () => {
  it('getCurrentScope 在 run 期间指向当前 scope，run 结束后恢复', () => {
    const parent = effectScope()
    const child = effectScope(true)

    expect(getCurrentScope()).toBeUndefined()

    parent.run(() => {
      expect(getCurrentScope()).toBe(parent)

      child.run(() => {
        expect(getCurrentScope()).toBe(child)
      })

      expect(getCurrentScope()).toBe(parent)
    })

    expect(getCurrentScope()).toBeUndefined()
  })

  it('父 scope 内创建的非 detached 子 scope 会随父 stop 级联停止', () => {
    const state = reactive({ count: 0 })
    const parent = effectScope()
    let observed = -1

    function trackObserved() {
      observed = state.count
    }

    parent.run(() => {
      const child = effectScope()

      child.run(() => {
        effect(trackObserved)
      })
    })

    expect(observed).toBe(0)

    state.count = 1
    expect(observed).toBe(1)

    parent.stop()

    state.count = 2
    expect(observed).toBe(1)
  })

  it('scope stop 后 run 不会执行回调并返回 undefined', () => {
    const scope = effectScope()
    const fn = vi.fn(() => {
      return 123
    })

    scope.stop()

    const result = scope.run(fn)

    expect(result).toBeUndefined()
    expect(fn).not.toHaveBeenCalled()
  })

  it('recordEffectScope 可把 effect 记录到指定 scope 并在 stop 时停止', () => {
    const scope = effectScope()

    const fn = vi.fn(() => {
      return 1
    })
    const realEffect = new ReactiveEffect(fn)
    const stopSpy = vi.spyOn(realEffect, 'stop')

    recordEffectScope(realEffect, scope)

    scope.stop()

    expect(stopSpy).toHaveBeenCalledTimes(1)
  })

  it('recordScopeCleanup 可把 cleanup 记录到指定 scope 并在 stop 时执行', () => {
    const scope = effectScope()
    const cleanup = vi.fn()

    recordScopeCleanup(cleanup, scope)

    scope.stop()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('recordScopeCleanup 默认记录到当前活跃 scope', () => {
    const scope = effectScope()
    const cleanup = vi.fn()

    scope.run(() => {
      recordScopeCleanup(cleanup)
    })

    scope.stop()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('stop 期间注册的 cleanup 会立即执行（对齐 effect 语义）', () => {
    const scope = effectScope()
    const calls: number[] = []
    let cleanupCalls = 0
    let lateCleanupCalls = 0

    function lateCleanup(): void {
      lateCleanupCalls++
      calls.push(2)
    }

    function cleanup(): void {
      cleanupCalls++
      calls.push(1)
      recordScopeCleanup(lateCleanup, scope)
    }

    recordScopeCleanup(cleanup, scope)

    scope.stop()

    expect(cleanupCalls).toBe(1)
    expect(lateCleanupCalls).toBe(1)
    expect(calls).toEqual([1, 2])
  })

  it('scope stop 后继续注册 cleanup 会立即执行（对齐 effect 语义）', () => {
    const scope = effectScope()
    let calls = 0

    function cleanup(): void {
      calls++
    }

    scope.stop()
    recordScopeCleanup(cleanup, scope)

    expect(calls).toBe(1)
  })

  it('stop 期间 cleanup 内调用 scope.run 不会再创建新 effect（对齐 Vue 语义）', () => {
    const state = reactive({ count: 0 })
    const scope = effectScope()
    let observed = -1
    let cleanupCalls = 0
    let runResult: unknown

    function trackObserved(): void {
      observed = state.count
    }

    function createEffectInScope(): void {
      effect(trackObserved)
    }

    function cleanup(): void {
      cleanupCalls++
      runResult = scope.run(createEffectInScope)
    }

    recordScopeCleanup(cleanup, scope)

    scope.stop()

    expect(cleanupCalls).toBe(1)
    expect(runResult).toBeUndefined()
    expect(observed).toBe(-1)

    state.count = 1
    expect(observed).toBe(-1)
  })
})
