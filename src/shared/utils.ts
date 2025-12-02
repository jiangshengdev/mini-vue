import type { PlainObject } from '@/shared/types.ts'
import type { ReactiveTarget } from '@/reactivity/shared/types.ts'

/**
 * 判断传入值是否为可供 reactive 使用的普通非 null 对象。
 */
export function isObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null
}

export function isPlainObject(value: unknown): value is PlainObject {
  if (!isObject(value)) {
    return false
  }

  const prototype: unknown = Object.getPrototypeOf(value)

  return prototype === null || prototype === Object.prototype
}

/**
 * 判断传入值是否为 null 或 undefined。
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

export function hasOwn(target: ReactiveTarget, key: PropertyKey): boolean {
  return Object.hasOwn(target, key)
}

export function isIntegerKey(key: PropertyKey): boolean {
  if (typeof key === 'symbol') {
    return false
  }

  if (typeof key === 'number') {
    return Number.isInteger(key) && key >= 0
  }

  if (typeof key === 'string') {
    if (key === 'NaN' || key.length === 0 || key.startsWith('-')) {
      return false
    }

    const parsed = Number(key)

    return Number.isInteger(parsed) && parsed >= 0 && String(parsed) === key
  }

  return false
}
