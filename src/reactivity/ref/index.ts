/**
 * Ref 相关 API 的聚合出口，统一向上层暴露 ref/computed/state 以及类型定义。
 * 仅做 re-export，不引入额外逻辑，确保入口清晰可控。
 * 通过集中出口避免上层跨目录引用内部文件，降低边界耦合。
 */

export { isRef, ref, toRef, unref } from './api.ts'
export type { ComputedGetter, ComputedSetter, WritableComputedOptions } from './computed.ts'
export { computed } from './computed.ts'
export type { State } from './state.ts'
export { state } from './state.ts'
export type { Ref } from './types.ts'
