/**
 * 响应式系统契约层的聚合出口。
 *
 * @remarks
 * - 导出内部标记常量（reactiveFlag、readonlyFlag、rawFlag、refFlag、iterateDependencyKey）。
 * - 导出触发操作类型常量（triggerOpTypes）及其类型（TriggerOpType）。
 * - 导出核心接口类型（EffectHandle、EffectInstance、EffectOptions、EffectScheduler、DependencyBucket、ReactiveRawTarget、ReactiveTarget）。
 */

export {
  iterateDependencyKey,
  rawFlag,
  reactiveFlag,
  readonlyFlag,
  refFlag,
  triggerOpTypes,
} from './constants.ts'
export type { TriggerOpType } from './constants.ts'
export type {
  DependencyBucket,
  EffectHandle,
  EffectInstance,
  EffectOptions,
  EffectScheduler,
  ReactiveRawTarget,
  ReactiveTarget,
} from './types.ts'
