import { ObjectRefImpl, RefImpl } from './impl.ts'
import { REF_FLAG, type RefMarker } from './internals/types.ts'
import type { Ref } from './types.ts'

export function ref<T>(value: T): Ref<T> {
  if (isRef(value)) {
    return value as Ref<T>
  }

  return new RefImpl(value)
}

export function isRef<T>(value: unknown): value is Ref<T> {
  return Boolean(
    value && typeof value === 'object' && (value as RefMarker)[REF_FLAG],
  )
}

export function unref<T>(value: T | Ref<T>): T {
  return isRef(value) ? value.value : value
}

export function toRef<
  T extends Record<PropertyKey, unknown>,
  K extends keyof T,
>(target: T, key: K): Ref<T[K]> {
  const existing = target[key]

  if (isRef(existing)) {
    return existing as Ref<T[K]>
  }

  return new ObjectRefImpl(target, key)
}
