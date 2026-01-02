/**
 * 响应式契约层的聚合出口，集中暴露标记常量与公共类型。
 *
 * @remarks
 * - 作为 reactivity 内部与外部使用者的共享接口层，不承载实现细节。
 * - 保持符号/类型集中输出，便于运行时 handler 与上层 API 解耦。
 */

export {
  iterateDependencyKey,
  rawKey,
  reactiveFlag,
  readonlyFlag,
  refFlag,
  shallowFlag,
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
