import type { StoreTree } from './types.ts'
import type { Ref } from '@/reactivity/index.ts'
import { isRef } from '@/reactivity/index.ts'

type PickByValue<T, Value> = {
  [K in keyof T as T[K] extends Value ? K : never]: T[K]
}

/**
 * 从 store 中提取 ref/computed 字段，便于解构使用且不丢失响应性。
 *
 * @public
 *
 * @remarks
 * - 保持简单：只处理 `isRef()` 为真的字段；函数等 action 会被忽略。
 * - 不做递归与深层转换。
 */
export function storeToRefs<Store extends StoreTree>(store: Store): PickByValue<Store, Ref> {
  const refs: Record<string, unknown> = Object.create(null) as Record<string, unknown>

  for (const key of Object.keys(store)) {
    if (key.startsWith('$')) {
      continue
    }

    const value = store[key]

    if (isRef(value)) {
      refs[key] = value
    }
  }

  return refs as PickByValue<Store, Ref>
}
