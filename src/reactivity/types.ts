/**
 * 定义响应式系统中使用的核心类型。
 */
export interface ReactiveEffectRunner<T = unknown> {
  deps: Dep[]

  (): T
}

export type Dep = Set<ReactiveEffectRunner>
