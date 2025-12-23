import type { ReactiveTarget } from './contracts/index.ts'
import { reactiveFlag } from './contracts/index.ts'
import { shallowReactiveHandlers, shallowReadonlyHandlers } from './internals/shallow-handlers.ts'
import { isSupportedTarget } from './to-raw.ts'
import { reactivityUnsupportedType } from '@/messages/index.ts'
import type { PlainObject } from '@/shared/index.ts'
import { isObject } from '@/shared/index.ts'

class ShallowReactiveCache {
  private readonly rawToReactive = new WeakMap<ReactiveTarget, ReactiveTarget>()

  get(target: ReactiveTarget): ReactiveTarget | undefined {
    return this.rawToReactive.get(target)
  }

  set(target: ReactiveTarget, proxy: ReactiveTarget): void {
    this.rawToReactive.set(target, proxy)
  }
}

const shallowReactiveCache = new ShallowReactiveCache()
const shallowReadonlyCache = new ShallowReactiveCache()

export function shallowReactive<T extends PlainObject>(target: T): T
export function shallowReactive<T extends readonly unknown[]>(target: T): T
export function shallowReactive<T>(target: T): T

export function shallowReactive(target: unknown): unknown {
  if (!isObject(target)) {
    return target
  }

  if ((target as ReactiveTarget)[reactiveFlag] === true) {
    return target
  }

  if (!isSupportedTarget(target)) {
    throw new TypeError(reactivityUnsupportedType, { cause: target })
  }

  const reactiveTarget = target as ReactiveTarget
  const cached = shallowReactiveCache.get(reactiveTarget)

  if (cached) {
    return cached
  }

  const proxy = new Proxy(reactiveTarget, shallowReactiveHandlers)

  shallowReactiveCache.set(reactiveTarget, proxy)

  return proxy
}

export function shallowReadonly<T extends PlainObject>(target: T): Readonly<T>
export function shallowReadonly<T extends readonly unknown[]>(target: T): Readonly<T>
export function shallowReadonly<T>(target: T): Readonly<T>

export function shallowReadonly(target: unknown): unknown {
  if (!isObject(target)) {
    return target
  }

  if (!isSupportedTarget(target)) {
    throw new TypeError(reactivityUnsupportedType, { cause: target })
  }

  const reactiveTarget = target as ReactiveTarget
  const cached = shallowReadonlyCache.get(reactiveTarget)

  if (cached) {
    return cached
  }

  const proxy = new Proxy(reactiveTarget, shallowReadonlyHandlers)

  shallowReadonlyCache.set(reactiveTarget, proxy)

  return proxy
}
