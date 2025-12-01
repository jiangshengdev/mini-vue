import { isObject } from '@/shared/utils.ts'
import { isReactive } from '../reactive.ts'
import { isRef } from '../ref/api.ts'
import type { WatchSource } from './core.ts'

export function resolveDeepOption(
  source: WatchSource<unknown>,
  explicit: boolean | undefined,
): boolean {
  if (typeof explicit === 'boolean') {
    return explicit
  }

  if (typeof source === 'function' || isRef(source)) {
    return false
  }

  if (isObject(source) && isReactive(source)) {
    return true
  }

  return false
}

export function createGetter<T>(
  source: WatchSource<T>,
  deep: boolean,
): () => T {
  if (typeof source === 'function') {
    return source
  }

  if (isRef(source)) {
    return () => {
      return source.value
    }
  }

  if (isReactive(source)) {
    if (deep) {
      return () => {
        return traverse(source) as T
      }
    }

    return () => {
      return source as T
    }
  }

  return () => {
    if (deep) {
      traverse(source)
    }

    return source as T
  }
}

function traverse<T>(value: T, seen = new Set<unknown>()): T {
  if (!isObject(value) || seen.has(value)) {
    return value
  }

  seen.add(value)

  if (isRef(value)) {
    traverse(value.value, seen)

    return value
  }

  for (const key of Object.keys(value)) {
    traverse((value as Record<PropertyKey, unknown>)[key], seen)
  }

  return value
}
