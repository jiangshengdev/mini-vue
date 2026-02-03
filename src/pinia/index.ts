/**
 * pinia 子域对外出口（最小实现）。
 */
export { createPinia } from './core/create-pinia.ts'
export { defineStore } from './core/define-store.ts'
export { piniaInjectionKey } from './core/injection.ts'
export { storeToRefs } from './core/store-to-refs.ts'
export type { Pinia, StoreInstance, StoreSetup, StoreTree } from './core/types.ts'
