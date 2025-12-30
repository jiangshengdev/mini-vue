/**
 * 响应式系统的对外统一出口。
 *
 * @remarks
 * 导出内容分为以下几类：
 *
 * - 响应式代理：`reactive`、`readonly`、`shallowReactive`、`shallowReadonly`、`isReactive`、`isReadonly`、`toRaw`
 * - Ref 相关：`ref`、`isRef`、`unref`、`toRef`、`computed`、`state`
 * - Effect 相关：`effect`、`ReactiveEffect`、`effectStack`
 * - EffectScope 相关：`effectScope`、`getCurrentScope`、`onScopeDispose`、`recordEffectScope`、`recordScopeCleanup`
 * - Watch 相关：`watch`
 * - 数组工具：`arrayUntrackedMutators`、`isArrayMutatorKey`
 * - 类型定义：`Ref`、`State`、`Reactive`、`DeepReadonly`、`ReadonlyReactive`、`EffectHandle`、`EffectOptions`、`EffectScheduler`、`EffectScope`、`ComputedGetter`、`ComputedSetter`、`WritableComputedOptions`、`WatchCallback`、`WatchOptions`、`WatchSource`、`WatchStopHandle`
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
