/**
 * 响应式系统的对外聚合出口，统一 reactivity/Ref/effect/watch 等 API。
 *
 * @remarks
 * - 只做导出与类型汇总，不包含运行时实现。
 * - 作为单点入口供 runtime 与外部用户引用，保持子模块解耦。
 */
export { arrayUntrackedMutators, isArrayMutatorKey } from './array/index.ts'
export type { EffectHandle, EffectOptions, EffectScheduler } from './contracts/index.ts'
export {
  effectScope,
  getCurrentScope,
  onScopeDispose,
  recordEffectScope,
  recordScopeCleanup,
} from './effect-scope.ts'
export type { EffectScope } from './effect-scope.ts'
export { effect, effectStack, ReactiveEffect } from './effect.ts'
export { pauseTracking, restoreTracking, withoutTracking } from './internals/index.ts'
export {
  isReactive,
  isReadonly,
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
} from './reactive.ts'
export type {
  ComputedGetter,
  ComputedSetter,
  Ref,
  State,
  WritableComputedOptions,
} from './ref/index.ts'
export { computed, isRef, ref, state, toRef, unref } from './ref/index.ts'
export { __hasDependencyBucket } from './testing/index.ts'
export { toRaw } from './to-raw.ts'
export type { DeepReadonly, Reactive, ReadonlyReactive } from './types.ts'
export { createWatch } from './watch/index.ts'
export type {
  WatchCallback,
  WatchOptions,
  WatchScheduler,
  WatchSource,
  WatchStopHandle,
} from './watch/index.ts'
