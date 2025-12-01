import { ReactiveEffect } from './effect.ts'
import { effectStack } from './internals/effect-stack.ts'
import { isReactive } from './reactive.ts'
import { isRef } from './ref/api.ts'
import type { Ref } from './ref/types.ts'
import { isObject } from '@/shared/utils.ts'

export type WatchSource<T> = Ref<T> | (() => T) | Record<PropertyKey, unknown>
export type WatchStopHandle = () => void
export type WatchCleanup = () => void
export type WatchCallback<T> = (
  newValue: T,
  oldValue: T | undefined,
  onCleanup: (cleanup: WatchCleanup) => void,
) => void
export interface WatchOptions {
  immediate?: boolean
  deep?: boolean
}

export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options: WatchOptions = {},
): WatchStopHandle {
  const { immediate = false } = options
  const deep = resolveDeepOption(source, options.deep)
  const getter = createGetter(source, deep)
  let cleanup: WatchCleanup | undefined
  let oldValue: T | undefined
  let hasOldValue = false

  const onCleanup = (fn: WatchCleanup): void => {
    cleanup = fn
  }

  const runner = new ReactiveEffect(getter as () => T, () => {
    job()
  })

  function job(): void {
    if (!runner.active) {
      return
    }

    const newValue = runner.run()

    if (!deep && hasOldValue && Object.is(newValue, oldValue)) {
      return
    }

    if (cleanup) {
      cleanup()
      cleanup = undefined
    }

    callback(newValue, hasOldValue ? oldValue : undefined, onCleanup)
    oldValue = newValue
    hasOldValue = true
  }

  const stop: WatchStopHandle = () => {
    runner.stop()

    if (cleanup) {
      cleanup()
      cleanup = undefined
    }
  }

  const parentEffect = effectStack.current

  if (parentEffect) {
    parentEffect.registerCleanup(stop)
  }

  if (immediate) {
    job()
  } else {
    oldValue = runner.run()
    hasOldValue = true
  }

  return stop
}

function resolveDeepOption(
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

function createGetter<T>(source: WatchSource<T>, deep: boolean): () => T {
  if (typeof source === 'function') {
    return source
  }

  if (isRef(source)) {
    return () => source.value
  }

  if (isReactive(source)) {
    if (deep) {
      return () => traverse(source) as T
    }

    return () => source as T
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
