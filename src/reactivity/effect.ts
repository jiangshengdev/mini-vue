import { effectScope } from './internals/effectScope.ts'
import type { Dep, EffectHandle, EffectInstance } from './shared/types.ts'

/**
 * 将副作用封装为类，集中管理依赖收集与生命周期操作。
 */
export class ReactiveEffect<T = unknown> implements EffectInstance<T> {
  /**
   * 保存用户传入的副作用函数作为核心执行单元。
   */
  private readonly fn: () => T
  /**
   * 记录当前副作用绑定的依赖集合，方便统一清理。
   */
  private deps: Dep[] = []
  /**
   * 存储由外部注册的清理回调，管理嵌套副作用的生命周期。
   */
  private cleanupFns: Array<() => void> = []

  constructor(fn: () => T) {
    this.fn = fn
  }

  /**
   * 代表副作用是否仍处于激活态，决定是否参与依赖收集。
   */
  private _active = true

  get active(): boolean {
    return this._active
  }

  /**
   * 执行副作用函数并围绕 effect 栈管理依赖收集流程。
   */
  run(): T {
    /* 已停止的副作用只执行原始函数，跳过依赖收集成本 */
    if (!this._active) {
      return this.fn()
    }

    /* 运行前重置上一轮留下的依赖，确保收集结果保持最新 */
    this.resetState()
    /* 将当前实例压入 effect 栈，允许 track 捕获它 */
    effectScope.push(this)
    try {
      return this.fn()
    } finally {
      /* 无论执行成功与否都需弹出自身，避免污染外层作用域 */
      effectScope.pop()
    }
  }

  /**
   * 手动终止副作用，使其不再响应后续的触发。
   */
  stop(): void {
    if (!this._active) {
      return
    }
    this._active = false
    /* 停止后立即清理依赖关系与清理回调，释放资源 */
    this.resetState()
  }

  /**
   * 记录当前副作用与依赖集合的关联，便于后续批量清理。
   */
  recordDependency(dep: Dep): void {
    this.deps.push(dep)
  }

  /**
   * 收集清理函数，通常用于管理嵌套 effect 的生命周期。
   */
  registerCleanup(cleanup: () => void): void {
    this.cleanupFns.push(cleanup)
  }

  /**
   * 解除所有已登记的依赖，并逐一调用清理回调。
   */
  private resetState(): void {
    if (this.deps.length > 0) {
      /* 逐个从依赖集合中移除自己，确保后续触发不再执行 */
      for (const dep of this.deps) {
        dep.delete(this)
      }
      this.deps = []
    }

    if (this.cleanupFns.length > 0) {
      /* 拷贝清理函数，避免执行过程中追加新清理导致循环紊乱 */
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
  /* 读取父级副作用，便于建立嵌套清理关系 */
  const parent = effectScope.current
  /* 每次调用都创建新的 ReactiveEffect 实例 */
  const instance = new ReactiveEffect(fn)

  if (parent) {
    /* 父级停止时同步停止子级，防止泄漏 */
    parent.registerCleanup(() => instance.stop())
  }

  /* 立即执行副作用，完成首次依赖收集 */
  instance.run()
  return instance
}
