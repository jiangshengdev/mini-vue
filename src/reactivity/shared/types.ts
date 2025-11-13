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
   * 记录一次依赖收集，便于后续清理时解除绑定。
   */
  recordDependency(dep: Dep): void

  /**
   * 注册清理回调，用于停止嵌套的副作用。
   */
  registerCleanup(cleanup: () => void): void
}

/**
 * 定义触发同一属性时需要执行的副作用集合。
 */
export type Dep = Set<EffectInstance>
