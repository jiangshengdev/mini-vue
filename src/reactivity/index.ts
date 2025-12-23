/**
 * 对外统一导出响应式系统的核心接口。
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
export { isReactive, reactive } from './reactive.ts'
export type {
  ComputedGetter,
  ComputedSetter,
  Ref,
  State,
  WritableComputedOptions,
} from './ref/index.ts'
export { computed, isRef, ref, state, toRef, unref } from './ref/index.ts'
export { shallowReactive, shallowReadonly } from './shallow.ts'
export { toRaw } from './to-raw.ts'
export { watch } from './watch/index.ts'
export type { WatchCallback, WatchOptions, WatchSource, WatchStopHandle } from './watch/index.ts'
