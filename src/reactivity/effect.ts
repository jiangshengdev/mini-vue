/**
 * 响应式副作用的核心实现，负责 effect 的创建、调度与生命周期管理。
 *
 * @remarks
 * - 通过 `ReactiveEffect` 封装副作用，统一依赖收集与清理流程。
 * - 提供 `effect` API 供外部注册副作用，并与 `effectScope` 协同管理嵌套关系。
 */
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

/**
 * 全局副作用执行栈，用于追踪当前正在执行的 effect。
 *
 * @remarks
 * - 依赖收集时通过 `effectStack.current` 获取当前活跃的副作用。
 * - 支持嵌套 effect 场景，内层 effect 执行完毕后自动恢复外层。
 */
export const effectStack = new ContextStack<EffectInstance>()

const debug = __INTERNAL_DEV__ ? createDebugLogger('effect') : null

/**
 * 用于兼容测试框架的 mock 函数命名接口，便于在开发态输出更可读的副作用名称。
 */
interface EffectFnMockLike {
  /** 返回 mock 函数名（如 `jest.fn().mockName()`），不存在则回退到 `Function.name`。 */
  getMockName?: () => string
}

/**
 * 将副作用封装为类，集中管理依赖收集、清理与生命周期操作。
 *
 * @remarks
 * - 每个 `ReactiveEffect` 实例对应一个用户副作用函数。
 * - 执行时会将自身压入 `effectStack`，使响应式属性读取时能够收集到当前副作用。
 * - 支持通过 `scheduler` 自定义触发时机，支持通过 `registerCleanup` 管理嵌套副作用。
 */
export class ReactiveEffect<T = unknown> implements EffectInstance<T> {
  /**
   * 自定义调度函数，用于延迟或批量执行副作用。
   *
   * @remarks
   * - 若提供 scheduler，依赖变更时会调用 scheduler 而非直接执行 `run()`。
   * - scheduler 接收一个任务函数，由其决定何时调用。
   */
  readonly scheduler?: EffectScheduler

  /**
   * 用户传入的副作用函数，作为核心执行单元。
   */
  private readonly effectFn: () => T

  /**
   * 开发态用于调试输出的副作用名称。
   *
   * @remarks
   * - 尽量从 mock 框架的 `getMockName()` 或函数的 `name` 属性推导。
   * - 仅在 `__INTERNAL_DEV__` 模式下使用。
   */
  private readonly effectName?: string

  /**
   * 记录当前副作用绑定的所有依赖集合，方便统一清理。
   *
   * @remarks
   * - 每次 `run()` 前会清空旧依赖，确保依赖关系保持最新。
   * - `stop()` 时会从所有依赖集合中移除自身。
   */
  private dependencyBuckets: DependencyBucket[] = []

  /**
   * 存储由外部注册的清理回调，用于管理嵌套副作用或外部资源的生命周期。
   *
   * @remarks
   * - 清理回调会在 `flushDependencies()` 时被调用。
   * - 常用于停止嵌套 effect、取消订阅等场景。
   */
  private cleanupTasks: Array<() => void> = []

  /**
   * 代表副作用是否仍处于激活态。
   *
   * @remarks
   * - 激活态的副作用会参与依赖收集，触发时会重新执行。
   * - 调用 `stop()` 后变为非激活态。
   */
  private innerActive = true

  /**
   * 构造函数：初始化副作用函数与可选的调度器。
   *
   * @param effectFn - 用户传入的副作用函数
   * @param scheduler - 可选的调度器，用于控制副作用的执行时机
   */
  constructor(effectFn: () => T, scheduler?: EffectScheduler) {
    /* 构造时记录调度器，使后续 trigger 能根据配置选择执行策略。 */
    this.effectFn = effectFn

    if (__INTERNAL_DEV__ && debug) {
      const effectFnMock = effectFn as (() => T) & EffectFnMockLike

      this.effectName = effectFnMock.getMockName ? effectFnMock.getMockName() : effectFn.name
    }

    this.scheduler = scheduler
  }

  /**
   * 获取当前副作用是否仍处于激活态。
   *
   * @returns 若仍参与依赖收集则返回 `true`
   */
  get active(): boolean {
    return this.innerActive
  }

  /**
   * 执行副作用函数并围绕 effect 栈管理依赖收集流程。
   *
   * @returns 副作用函数的返回值
   *
   * @remarks
   * - 激活态时会先清理旧依赖，再将自身压入 `effectStack` 执行函数，执行完毕后弹出。
   * - 非激活态时仅执行函数，不进行依赖收集。
   *
   * @throws 原样抛出副作用函数内部的异常，同时会通过 `setErrorHandler` 暴露给统一错误处理器。
   */
  run(): T {
    const runEffectFunction = (shouldTrack: boolean): T => {
      return runThrowing(
        () => {
          if (__INTERNAL_DEV__ && debug) {
            debug('run', shouldTrack ? '执行并收集依赖' : '执行但不收集依赖', {
              effectName: this.effectName,
            })
          }

          return this.effectFn()
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
        effectName: this.effectName,
      })
    }

    this.flushDependencies()

    return runEffectFunction(true)
  }

  /**
   * 手动终止副作用，使其不再响应后续的触发。
   *
   * @remarks
   * - 停止后会立即清理所有依赖关系与清理回调，释放资源。
   * - 重复调用 `stop()` 是安全的，不会产生副作用。
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
   * 记录当前副作用与依赖集合的双向关联，便于后续批量清理。
   *
   * @param dependencyBucket - 目标字段对应的副作用集合
   * @param debugInfo - 可选的调试信息，仅在开发态使用
   */
  recordDependency(dependencyBucket: DependencyBucket, debugInfo?: PlainObject): void {
    if (__INTERNAL_DEV__ && debug) {
      debug('recordDependency', '记录依赖', { ...debugInfo, effectName: this.effectName })
    }

    this.dependencyBuckets.push(dependencyBucket)
  }

  /**
   * 注册清理回调，用于管理嵌套 effect 或外部资源的生命周期。
   *
   * @param cleanup - 清理函数，会在副作用重新执行前或停止时被调用
   *
   * @remarks
   * - 若副作用已停止，清理函数会被立即执行而非入队。
   * - 常用于停止嵌套 effect、取消订阅、释放外部资源等场景。
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
   * 解除所有已登记的依赖关系，并逐一调用清理回调。
   *
   * @remarks
   * - 从所有依赖集合中移除自身，确保后续触发不再执行。
   * - 拷贝清理函数列表后再执行，避免执行过程中追加新清理导致循环紊乱。
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
 * 创建响应式副作用：立即执行副作用函数并返回可控的句柄。
 *
 * @param effectFn - 用户传入的副作用函数，会被立即执行一次以完成首次依赖收集
 * @param options - 可选配置，支持自定义调度器
 * @returns 副作用句柄，可通过 `run()` 手动执行或 `stop()` 停止
 *
 * @remarks
 * - 副作用函数执行期间读取的响应式属性会被自动收集为依赖。
 * - 依赖变更时，副作用会根据 scheduler 配置决定执行时机。
 * - 若存在父级 effect，子 effect 会在父级停止时自动停止。
 * - 副作用会被自动登记到当前活跃的 `effectScope`，便于统一管理生命周期。
 *
 * @throws 用户副作用执行时抛出的异常会同步传播，并在传播前经过 `setErrorHandler`。
 *
 * @public
 */
export function effect<T>(effectFn: () => T, options: EffectOptions = {}): EffectHandle<T> {
  /* 读取父级副作用，便于建立嵌套清理关系 */
  const parent = effectStack.current
  /* 每次调用都创建新的 ReactiveEffect 实例 */
  const instance = new ReactiveEffect(effectFn, options.scheduler)

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
