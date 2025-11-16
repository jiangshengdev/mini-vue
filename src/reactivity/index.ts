/**
 * 对外统一导出响应式系统的核心接口。
 */
export { effect } from './effect.ts'
export { reactive } from './reactive.ts'
export { ref, isRef, unref, toRef } from './ref/index.ts'
export type { Ref } from './ref/index.ts'
