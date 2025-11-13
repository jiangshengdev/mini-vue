import { effectScope } from './internals/effectScope.ts'
import type { Dep, EffectHandle, EffectInstance } from './shared/types.ts'

/**
 * 将副作用封装为类，集中管理依赖收集与生命周期操作。
 */
export class ReactiveEffect<T = unknown> implements EffectInstance<T> {
  private readonly fn: () => T
  private deps: Dep[] = []
  private cleanupFns: Array<() => void> = []

  constructor(fn: () => T) {
    this.fn = fn
  }

  private _active = true

  get active(): boolean {
    return this._active
  }

  run(): T {
    if (!this._active) {
      // 已停止的副作用仅执行原始函数，不再进行依赖收集。
      return this.fn()
    }

    this.resetState()
    effectScope.push(this)
    try {
      return this.fn()
    } finally {
      effectScope.pop()
    }
  }

  stop(): void {
    if (!this._active) {
      return
    }
    this._active = false
    this.resetState()
  }

  recordDependency(dep: Dep): void {
    this.deps.push(dep)
  }

  registerCleanup(cleanup: () => void): void {
    this.cleanupFns.push(cleanup)
  }

  private resetState(): void {
    if (this.deps.length > 0) {
      for (const dep of this.deps) {
        dep.delete(this)
      }
      this.deps = []
    }

    if (this.cleanupFns.length > 0) {
      const cleanupFns = this.cleanupFns.slice()
      this.cleanupFns = []
      for (const cleanup of cleanupFns) {
        cleanup()
      }
    }
  }
}

/**
 * 最小版 effect：立即执行副作用并返回可控的句柄。
 */
export function effect<T>(fn: () => T): EffectHandle<T> {
  const parent = effectScope.current
  const instance = new ReactiveEffect(fn)

  if (parent) {
    parent.registerCleanup(() => instance.stop())
  }

  instance.run()
  return instance
}
