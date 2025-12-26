import type { rawKey, reactiveFlag, readonlyFlag } from './constants.ts'
import type { PlainObject } from '@/shared/index.ts'

/**
 * 描述 effect 对应的外部可用接口，供用户控制副作用的执行与停止。
 *
 * @remarks
 * - 该接口是 `ReactiveEffect` 对外暴露的最小契约，隐藏内部依赖管理细节。
 * - 通过 `run()` 可手动触发副作用并获取返回值，通过 `stop()` 可终止副作用的响应式追踪。
 *
 * @beta
 */
export interface EffectHandle<T = unknown> {
  /**
   * 当前副作用是否处于激活态。
   *
   * @remarks
   * - 激活态的副作用会参与依赖收集，触发时会重新执行。
   * - 调用 `stop()` 后变为非激活态，后续触发将被忽略。
   */
  readonly active: boolean

  /**
   * 手动重新执行副作用函数，返回执行结果。
   *
   * @remarks
   * - 激活态时会重新收集依赖，非激活态时仅执行函数但不收集依赖。
   */
  run(): T

  /**
   * 停止副作用并清理所有依赖关系，使其不再响应后续的触发。
   */
  stop(): void
}

/**
 * 描述响应式系统内部维护的完整 effect 实例，扩展 `EffectHandle` 以支持依赖管理与清理。
 *
 * @remarks
 * - 该接口供响应式系统内部使用，包含依赖收集、清理回调等内部机制。
 * - 外部用户通常只需使用 `EffectHandle` 接口。
 */
export interface EffectInstance<T = unknown> extends EffectHandle<T> {
  /**
   * 可选调度函数，触发时决定任务何时执行。
   *
   * @remarks
   * - 若提供 scheduler，依赖变更时不会立即执行副作用，而是交给 scheduler 决定执行时机。
   * - 常用于批量更新、异步调度等场景。
   */
  readonly scheduler?: EffectScheduler

  /**
   * 记录当前副作用与依赖集合的双向关联，便于后续清理时解除绑定。
   *
   * @param dependencyBucket - 目标字段对应的副作用集合
   * @param debugInfo - 可选的调试信息，仅在开发态使用
   */
  recordDependency(dependencyBucket: DependencyBucket, debugInfo?: PlainObject): void

  /**
   * 注册清理回调，用于管理嵌套副作用或外部资源的生命周期。
   *
   * @remarks
   * - 清理回调会在副作用重新执行前或停止时被调用。
   * - 常用于停止嵌套的 effect、取消订阅等场景。
   */
  registerCleanup(cleanup: () => void): void
}

/**
 * 定义触发同一属性时需要执行的副作用集合。
 *
 * @remarks
 * - 每个响应式对象的每个属性都对应一个 `DependencyBucket`。
 * - 使用 `Set` 保证同一副作用不会被重复收集。
 */
export type DependencyBucket = Set<EffectInstance>

/**
 * `effect` 调度器签名，接收一个可延迟执行的任务函数。
 *
 * @remarks
 * - 调度器决定副作用何时执行，可用于实现批量更新、异步调度等策略。
 * - 任务函数内部会调用 `effect.run()` 重新执行副作用。
 *
 * @beta
 */
export type EffectScheduler = (job: () => void) => void

/**
 * `effect` 的可选配置项。
 *
 * @beta
 */
export interface EffectOptions {
  /**
   * 自定义调度行为，允许延迟或合并 effect 执行。
   *
   * @remarks
   * - 若不提供，副作用会在依赖变更时同步执行。
   * - 提供后，依赖变更时会调用 scheduler 而非直接执行副作用。
   */
  scheduler?: EffectScheduler
}

/**
 * 响应式代理对象的内部标记接口，用于识别代理类型与获取原始对象。
 *
 * @remarks
 * - 这些标记由 Proxy handler 在读取时动态返回，不会真实写入用户对象。
 * - 通过 Symbol 键避免与用户属性冲突。
 */
export interface ReactiveProxyInternals {
  /** 标记对象已被 `reactive` 代理，供 `isReactive` 识别。 */
  readonly [reactiveFlag]?: true
  /** 标记对象已被 `readonly` 代理，供 `isReadonly` 识别。 */
  readonly [readonlyFlag]?: true
  /** 存放对应的原始对象引用，便于 `toRaw` 取回。 */
  readonly [rawKey]?: PlainObject | unknown[]
}

/** 支持响应式代理的原生目标类型，目前覆盖普通对象与数组。 */
export type ReactiveRawTarget = PlainObject | unknown[]

/** 将原生目标类型与内部标记接口合并，形成完整的响应式目标类型。 */
type ReactiveTargetBase<T extends ReactiveRawTarget> = T & ReactiveProxyInternals

/** 响应式系统可处理的目标对象类型，包含内部标记。 */
export type ReactiveTarget = ReactiveTargetBase<ReactiveRawTarget>
