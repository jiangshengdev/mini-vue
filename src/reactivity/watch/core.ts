import { ReactiveEffect } from '../effect.ts'
import { effectStack } from '../internals/effect-stack.ts'
import type { Ref } from '../ref/types.ts'
import { createGetter, resolveDeepOption } from './utils.ts'

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
