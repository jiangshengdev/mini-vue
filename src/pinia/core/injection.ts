import type { InjectionKey } from '@/shared/index.ts'
import type { Pinia } from './types.ts'

/**
 * pinia 注入 key。
 *
 * @remarks
 * 由 `createPinia().install(app)` 写入，供 `defineStore` 在 setup 内读取。
 */
export const piniaInjectionKey = Symbol('pinia') as InjectionKey<Pinia>

