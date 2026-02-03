/**
 * Pinia core 子目录聚合出口。
 *
 * @remarks
 * 遵循仓库导出约定：上层 `index.ts` 从子目录导出时只能指向子目录的 `index.ts`。
 */
export { createPinia } from './create-pinia.ts'
export { defineStore } from './define-store.ts'
export { piniaInjectionKey } from './injection.ts'
export { storeToRefs } from './store-to-refs.ts'
export type { Pinia, StoreInstance, StoreSetup, StoreTree } from './types.ts'
