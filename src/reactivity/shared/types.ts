/**
 * 定义响应式系统中使用的核心类型。
 */
export interface ReactiveEffectRunner<T = unknown> {
  /**
   * 记录该副作用目前订阅的依赖集合，便于清理。
   */
  deps: Dep[]

  /**
   * 执行副作用逻辑并返回执行结果。
   */
  (): T
}

/**
 * 用于存放订阅同一响应式属性的副作用集合。
 */
export type Dep = Set<ReactiveEffectRunner>
