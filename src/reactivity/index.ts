/**
 * 对外统一导出响应式系统的核心接口。
 */
export { effect } from './effect.ts'
export { reactive } from './reactive.ts'
export { watch } from './watch/index.ts'
export { computed, ref, isRef, unref, toRef } from './ref/index.ts'
export type { Ref } from './ref/index.ts'
export { effectScope, getCurrentScope, onScopeDispose } from './effect-scope.ts'
export type { EffectScope } from './effect-scope.ts'
export type { ComputedGetter, ComputedSetter, WritableComputedOptions } from './ref/index.ts'
export { setRuntimeErrorHandler } from '../shared/error-handling.ts'
export type { RuntimeErrorContext, RuntimeErrorHandler } from '../shared/error-handling.ts'
