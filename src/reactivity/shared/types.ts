/**
 * 定义响应式系统中使用的核心类型。
 */
export interface ReactiveEffectRunner<T = unknown> {
  /**
   * 记录该副作用目前订阅的依赖集合，便于清理。
   */
  deps: Dep[]

  /**
   * 记录下一次执行前需要调用的清理回调，用于停止旧的嵌套副作用。
   */
  cleanupFns: Array<() => void>

  /**
   * 标记当前副作用是否仍处于激活状态。
   */
  active: boolean

  /**
   * 允许外部停止该副作用的快捷方法。
   */
  stop?: () => void

  /**
   * 执行副作用逻辑并返回执行结果。
   */
  (): T
}

/**
 * 用于存放订阅同一响应式属性的副作用集合。
 */
export type Dep = Set<ReactiveEffectRunner>
