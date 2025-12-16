import type {
  DependencyBucket,
  EffectHandle,
  EffectInstance,
  EffectOptions,
  EffectScheduler,
} from './contracts/index.ts'
import { recordEffectScope } from './effect-scope.ts'
import type { PlainObject } from '@/shared/index.ts'
import {
  __INTERNAL_DEV__,
  ContextStack,
  createDebugLogger,
  errorContexts,
  errorPhases,
  runSilent,
  runThrowing,
} from '@/shared/index.ts'

export const effectStack = new ContextStack<EffectInstance>()
const debug = __INTERNAL_DEV__ ? createDebugLogger('effect') : null

interface EffectFnMockLike {
  getMockName?: () => string
}

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

  private readonly fnName?: string

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

    if (__INTERNAL_DEV__ && debug) {
      const fnMock = fn as (() => T) & EffectFnMockLike

      this.fnName = fnMock.getMockName ? fnMock.getMockName() : fn.name
    }

    this.scheduler = scheduler
  }

  get active(): boolean {
    return this.innerActive
  }

  /**
   * 执行副作用函数并围绕 effect 栈管理依赖收集流程。
   *
   * @throws
   * @see {@link https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown | unknown }
   * 原样抛出副作用函数内部的异常，同时会通过 setErrorHandler 暴露给统一错误处理器。
   */
  run(): T {
    const runEffectFunction = (shouldTrack: boolean): T => {
      return runThrowing(
        () => {
          if (__INTERNAL_DEV__ && debug) {
            debug('run', shouldTrack ? '执行并收集依赖' : '执行但不收集依赖', {
              fnName: this.fnName,
            })
          }

          return this.fn()
        },
        {
          origin: errorContexts.effectRunner,
          handlerPhase: errorPhases.sync,
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
      if (__INTERNAL_DEV__ && debug) {
        debug('run', '已停止，跳过依赖收集')
      }

      return runEffectFunction(false)
    }

    /* 运行前重置上一轮留下的依赖，确保收集结果保持最新 */
    if (__INTERNAL_DEV__ && debug) {
      debug('run', '执行前清理旧依赖', {
        fnName: this.fnName,
      })
    }

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

    if (__INTERNAL_DEV__ && debug) {
      debug('stop', '停止副作用')
    }

    this.innerActive = false
    /* 停止后立即清理依赖关系与清理回调，释放资源 */
    this.flushDependencies()
  }

  /**
   * 记录当前副作用与依赖集合的关联，便于后续批量清理。
   */
  recordDependency(dependencyBucket: DependencyBucket, debugInfo?: PlainObject): void {
    if (__INTERNAL_DEV__ && debug) {
      debug('recordDependency', '记录依赖', { ...debugInfo, fnName: this.fnName })
    }

    this.dependencyBuckets.push(dependencyBucket)
  }

  /**
   * 收集清理函数，通常用于管理嵌套 effect 的生命周期。
   */
  registerCleanup(cleanup: () => void): void {
    if (__INTERNAL_DEV__ && debug) {
      debug('registerCleanup', '登记清理回调')
    }

    if (!this.innerActive) {
      runSilent(cleanup, {
        origin: errorContexts.effectCleanup,
        handlerPhase: errorPhases.sync,
      })

      return
    }

    this.cleanupTasks.push(cleanup)
  }

  /**
   * 解除所有已登记的依赖，并逐一调用清理回调。
   */
  private flushDependencies(): void {
    if (this.dependencyBuckets.length > 0) {
      /* 逐个从依赖集合中移除自己，确保后续触发不再执行 */
      if (__INTERNAL_DEV__ && debug) {
        debug('flushDependencies', '开始清理依赖', {
          dependencyCount: this.dependencyBuckets.length,
        })
      }

      for (const dependencyBucket of this.dependencyBuckets) {
        dependencyBucket.delete(this)
      }

      this.dependencyBuckets = []
    }

    if (this.cleanupTasks.length > 0) {
      /* 拷贝清理函数，避免执行过程中追加新清理导致循环紊乱 */
      const cleanupTasks = [...this.cleanupTasks]

      if (__INTERNAL_DEV__ && debug) {
        debug('flushDependencies', '执行清理回调', {
          cleanupCount: cleanupTasks.length,
        })
      }

      this.cleanupTasks = []

      for (const cleanup of cleanupTasks) {
        runSilent(cleanup, {
          origin: errorContexts.effectCleanup,
          handlerPhase: errorPhases.sync,
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
 * @throws
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown | unknown }
 * 用户副作用执行时抛出的异常会同步传播，并在传播前经过 setErrorHandler。
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
