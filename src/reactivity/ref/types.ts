import type { DependencyBucket } from '../shared/types.ts'
import type { refFlag } from '@/reactivity/shared/constants.ts'

/**
 * Ref 接口暴露响应式值的访问器。
 */
export interface Ref<T = unknown> {
  value: T
}

/**
 * RefMarker 用于补充类型信息，表示对象携带 refFlag。
 */
export interface RefMarker {
  readonly [refFlag]: true
}

/**
 * RefDepCarrier 表示可被依赖收集器追踪的目标，需提供依赖集合。
 */
export interface RefDepCarrier extends RefMarker {
  readonly dependencyBucket: DependencyBucket
}
