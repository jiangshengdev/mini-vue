/**
 * Ref 相关 API 的聚合出口。
 *
 * @remarks
 * - 导出 `ref`、`isRef`、`unref`、`toRef` 等基础 API。
 * - 导出 `computed` 计算属性 API 及其类型。
 * - 导出 `state` 状态管理 API 及其类型。
 * - 导出 `Ref` 接口类型。
 */

export { isRef, ref, toRef, unref } from './api.ts'
export type { ComputedGetter, ComputedSetter, WritableComputedOptions } from './computed.ts'
export { computed } from './computed.ts'
export type { State } from './state.ts'
export { state } from './state.ts'
export type { Ref } from './types.ts'
