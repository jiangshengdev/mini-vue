import {
  runtimeErrorContexts,
  runtimeErrorHandlerPhases,
  runtimeErrorPropagationStrategies,
  runWithErrorChannel,
} from '../shared/runtime-error-channel.ts'
import { recordEffectScope } from './effect-scope.ts'
import { effectStack } from './internals/effect-stack.ts'
import type {
  DependencyBucket,
  EffectHandle,
  EffectInstance,
  EffectOptions,
  EffectScheduler,
} from './shared/types.ts'

/**
 * 将副作用封装为类，集中管理依赖收集与生命周期操作。
 */
export class ReactiveEffect<T = unknown> implements EffectInstance<T> {
  /**
   * 自定义调度函数，用于延迟或批量执行副作用。
   */
  readonly scheduler?: EffectScheduler

  /**
   * 保存用户传入的副作用函数作为核心执行单元。
   */
  private readonly fn: () => T

  /**
   * 记录当前副作用绑定的依赖集合，方便统一清理。
   */
  private dependencyBuckets: DependencyBucket[] = []

  /**
   * 存储由外部注册的清理回调，管理嵌套副作用的生命周期。
   */
  private cleanupTasks: Array<() => void> = []

  /**
   * 代表副作用是否仍处于激活态，决定是否参与依赖收集。
   */
  private innerActive = true

  constructor(fn: () => T, scheduler?: EffectScheduler) {
    /* 构造时记录调度器，使后续 trigger 能根据配置选择执行策略 */
    this.fn = fn
    this.scheduler = scheduler
  }

  get active(): boolean {
    return this.innerActive
  }

  /**
   * 执行副作用函数并围绕 effect 栈管理依赖收集流程。
   *
   * @throws {@link https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown | unknown}
   * 原样抛出副作用函数内部的异常，同时会通过 setRuntimeErrorHandler 暴露给统一错误处理器。
   */
  run(): T {
    const runEffectFunction = (shouldTrack: boolean): T => {
      return runWithErrorChannel(
        () => {
          return this.fn()
        },
        {
          origin: runtimeErrorContexts.effectRunner,
          handlerPhase: runtimeErrorHandlerPhases.sync,
          propagate: runtimeErrorPropagationStrategies.sync,
          beforeRun: () => {
            if (shouldTrack) {
              effectStack.push(this)
            }
          },
          afterRun() {
            if (shouldTrack) {
              effectStack.pop()
            }
          },
        },
      )
    }

    /* 已停止的副作用只执行原始函数，跳过依赖收集成本 */
    if (!this.innerActive) {
      return runEffectFunction(false)
    }

    /* 运行前重置上一轮留下的依赖，确保收集结果保持最新 */
    this.flushDependencies()

    return runEffectFunction(true)
  }

  /**
   * 手动终止副作用，使其不再响应后续的触发。
   */
  stop(): void {
    if (!this.innerActive) {
      return
    }

    this.innerActive = false
    /* 停止后立即清理依赖关系与清理回调，释放资源 */
    this.flushDependencies()
  }

  /**
   * 记录当前副作用与依赖集合的关联，便于后续批量清理。
   */
  recordDependency(dependencyBucket: DependencyBucket): void {
    this.dependencyBuckets.push(dependencyBucket)
  }

  /**
   * 收集清理函数，通常用于管理嵌套 effect 的生命周期。
   */
  registerCleanup(cleanup: () => void): void {
    this.cleanupTasks.push(cleanup)
  }

  /**
   * 解除所有已登记的依赖，并逐一调用清理回调。
   */
  private flushDependencies(): void {
    if (this.dependencyBuckets.length > 0) {
      /* 逐个从依赖集合中移除自己，确保后续触发不再执行 */
      for (const dependencyBucket of this.dependencyBuckets) {
        dependencyBucket.delete(this)
      }

      this.dependencyBuckets = []
    }

    if (this.cleanupTasks.length > 0) {
      /* 拷贝清理函数，避免执行过程中追加新清理导致循环紊乱 */
      const cleanupTasks = [...this.cleanupTasks]

      this.cleanupTasks = []

      for (const cleanup of cleanupTasks) {
        runWithErrorChannel(cleanup, {
          origin: runtimeErrorContexts.effectCleanup,
          handlerPhase: runtimeErrorHandlerPhases.sync,
          propagate: runtimeErrorPropagationStrategies.silent,
        })
      }
    }
  }
}

/**
 * 最小版 effect：立即执行副作用并返回可控的句柄，亦支持传入调度选项。
 *
 * @public
 *
 * @throws {@link https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown | unknown}
 * 用户副作用执行时抛出的异常会同步传播，并在传播前经过 setRuntimeErrorHandler。
 */
export function effect<T>(fn: () => T, options: EffectOptions = {}): EffectHandle<T> {
  /* 读取父级副作用，便于建立嵌套清理关系 */
  const parent = effectStack.current
  /* 每次调用都创建新的 ReactiveEffect 实例 */
  const instance = new ReactiveEffect(fn, options.scheduler)

  recordEffectScope(instance)

  if (parent) {
    /* 父级停止时同步停止子级，防止泄漏 */
    parent.registerCleanup(() => {
      instance.stop()
    })
  }

  /* 立即执行副作用，完成首次依赖收集 */
  instance.run()

  return instance
}
