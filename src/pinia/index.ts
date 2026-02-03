/**
 * Pinia 子域对外出口（最小实现）。
 */
export { createPinia, defineStore, piniaInjectionKey, storeToRefs } from './core/index.ts'
export type { Pinia, StoreInstance, StoreSetup, StoreTree } from './core/index.ts'
