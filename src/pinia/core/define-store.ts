import { piniaInjectionKey } from './injection.ts'
import type { Pinia, StoreInstance, StoreSetup, StoreTree } from './types.ts'
import {
  piniaDefineStoreDuplicateId,
  piniaNotInstalled,
  piniaSetupMustReturnObject,
} from '@/messages/index.ts'
import { inject } from '@/runtime-core/index.ts'

/**
 * 全局 store 定义表：用于检测重复 id 的不同定义。
 *
 * @remarks
 * - 该表不依赖 pinia 实例：目的是在 `defineStore()` 时尽早报错。
 * - 仅用函数引用做一致性判断，保持实现简单。
 */
const storeSetups = new Map<string, unknown>()

function resolvePinia(): Pinia {
  const pinia = inject(piniaInjectionKey)

  if (!pinia) {
    throw new Error(piniaNotInstalled, { cause: piniaInjectionKey })
  }

  return pinia
}

/**
 * 定义一个 setup store（现代形式）。
 *
 * @public
 *
 * @remarks
 * - 仅允许在组件 setup 执行窗口内调用返回的 `useStore()`（因为依赖 `inject()`）。
 * - 同一 `id` 的不同定义会在 `defineStore` 阶段直接抛错。
 */
export function defineStore<Id extends string, Store extends StoreTree>(
  id: Id,
  setup: StoreSetup<Store>,
): () => StoreInstance<Id, Store> {
  const existingSetup = storeSetups.get(id)

  if (existingSetup && existingSetup !== setup) {
    throw new Error(piniaDefineStoreDuplicateId, { cause: { id } })
  }

  storeSetups.set(id, setup)

  return function useStore(): StoreInstance<Id, Store> {
    const pinia = resolvePinia()
    const existing = pinia._stores.get(id)

    if (existing) {
      return existing as StoreInstance<Id, Store>
    }

    const store = setup() as unknown

    if (!store || typeof store !== 'object') {
      throw new TypeError(piniaSetupMustReturnObject, { cause: { id, returned: store } })
    }

    Object.defineProperties(store, {
      $id: { value: id, enumerable: false },
      $pinia: { value: pinia, enumerable: false },
    })

    pinia._stores.set(id, store)

    return store as StoreInstance<Id, Store>
  }
}
