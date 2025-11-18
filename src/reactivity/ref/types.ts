import type { DependencyBucket } from '../shared/types.ts'

/**
 * 标记对象具备 Ref 能力的内部符号，避免与用户属性冲突。
 */
export const REF_FLAG = Symbol('isRef')

/**
 * Ref 接口暴露响应式值的访问器。
 */
export interface Ref<T = unknown> {
  value: T
}

/**
 * RefMarker 用于补充类型信息，表示对象携带 REF_FLAG。
 */
export interface RefMarker {
  readonly [REF_FLAG]: true
}

/**
 * RefDepCarrier 表示可被依赖收集器追踪的目标，需提供依赖集合。
 */
export interface RefDepCarrier extends RefMarker {
  readonly dep: DependencyBucket
}
