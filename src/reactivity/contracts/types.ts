import type { rawFlag, reactiveFlag } from './constants.ts'
import type { PlainObject } from '@/shared/index.ts'

/**
 * 描述 effect 对应的外部可用接口。
 */
export interface EffectHandle<T = unknown> {
  /**
   * 当前副作用是否处于激活态，激活时才会参与依赖收集。
   */
  readonly active: boolean

  /**
   * 手动重新执行副作用，返回执行结果。
   */
  run(): T

  /**
   * 停止副作用并清理依赖，下次触发时不会再执行。
   */
  stop(): void
}

/**
 * 描述响应式系统内部维护的完整 effect 实例。
 */
export interface EffectInstance<T = unknown> extends EffectHandle<T> {
  /**
   * 可选调度函数，触发时决定任务何时执行。
   */
  readonly scheduler?: EffectScheduler
  /**
   * 记录一次依赖收集，便于后续清理时解除绑定。
   */
  recordDependency(dependencyBucket: DependencyBucket, debugInfo?: PlainObject): void

  /**
   * 注册清理回调，用于停止嵌套的副作用。
   */
  registerCleanup(cleanup: () => void): void
}

/**
 * 定义触发同一属性时需要执行的副作用集合。
 */
export type DependencyBucket = Set<EffectInstance>

/**
 * `effect` 调度器接收一个可延迟执行的任务。
 */
export type EffectScheduler = (job: () => void) => void

/**
 * `effect` 的可选配置，目前仅支持自定义调度器。
 */
export interface EffectOptions {
  /** 自定义调度行为，允许延迟或合并 effect 执行。 */
  scheduler?: EffectScheduler
}

/**
 * 支持响应式代理的原生目标类型，目前覆盖普通对象与数组。
 */
export interface ReactiveProxyInternals {
  /** 标记对象已被 `reactive` 代理，供 `isReactive` 识别。 */
  readonly [reactiveFlag]?: true
  /** 存放对应的原始对象引用，便于 `toRaw` 取回。 */
  readonly [rawFlag]?: PlainObject | unknown[]
}

type ReactiveRawTarget = PlainObject | unknown[]

type ReactiveTargetBase<T extends ReactiveRawTarget> = T & ReactiveProxyInternals

export type ReactiveTarget = ReactiveTargetBase<ReactiveRawTarget>
