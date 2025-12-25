/**
 * 提供 `reactive`/`readonly`/`shallowReactive`/`shallowReadonly`，统一在此文件内复用缓存与创建逻辑。
 */
import type { ReactiveTarget } from './contracts/index.ts'
import { reactiveFlag, readonlyFlag } from './contracts/index.ts'
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers,
} from './internals/index.ts'
import { isSupportedTarget } from './to-raw.ts'
import type { Reactive, ReadonlyReactive } from './types.ts'
import { reactivityUnsupportedType } from '@/messages/index.ts'
import type { PlainObject } from '@/shared/index.ts'
import { isObject } from '@/shared/index.ts'

type ProxyCache = WeakMap<ReactiveTarget, ReactiveTarget>

const reactiveCache: ProxyCache = new WeakMap()
const readonlyCache: ProxyCache = new WeakMap()
const shallowReactiveCache: ProxyCache = new WeakMap()
const shallowReadonlyCache: ProxyCache = new WeakMap()

function createProxy(
  target: unknown,
  handlers: ProxyHandler<ReactiveTarget>,
  cache: ProxyCache,
  { skipReactiveCheck = false }: { skipReactiveCheck?: boolean } = {},
): unknown {
  /* 非对象值无法建立响应式代理，直接返回原值 */
  if (!isObject(target)) {
    return target
  }

  /* 可选跳过已代理对象，保持 reactive/shallowReactive 的幂等性。 */
  if (skipReactiveCheck && (target as ReactiveTarget)[reactiveFlag] === true) {
    return target
  }

  /* 当前实现仅支持普通对象与数组，其它原生对象直接报错 */
  if (!isSupportedTarget(target)) {
    throw new TypeError(reactivityUnsupportedType, { cause: target })
  }

  const reactiveTarget = target as ReactiveTarget
  const cached = cache.get(reactiveTarget)

  if (cached) {
    /* 命中缓存即复用已有代理，保持依赖与副作用的一致性。 */
    return cached
  }

  /* 未命中缓存时创建新代理并登记映射 */
  const proxy = new Proxy(reactiveTarget, handlers)

  cache.set(reactiveTarget, proxy)

  return proxy
}

/**
 * 将普通对象或数组转换为响应式 Proxy。
 *
 * @public
 */
export function reactive<T extends PlainObject>(target: T): Reactive<T>
/**
 * @public
 */
export function reactive<T extends readonly unknown[]>(target: T): Reactive<T>
/**
 * @public
 */
export function reactive<T>(target: T): T

export function reactive(target: unknown): unknown {
  return createProxy(target, mutableHandlers, reactiveCache, { skipReactiveCheck: true })
}

export function shallowReactive<T extends PlainObject>(target: T): T
export function shallowReactive<T extends readonly unknown[]>(target: T): T
export function shallowReactive<T>(target: T): T

export function shallowReactive(target: unknown): unknown {
  return createProxy(target, shallowReactiveHandlers, shallowReactiveCache, {
    skipReactiveCheck: true,
  })
}

export function shallowReadonly<T extends PlainObject>(target: T): Readonly<T>
export function shallowReadonly<T extends readonly unknown[]>(target: T): Readonly<T>
export function shallowReadonly<T>(target: T): Readonly<T>

export function shallowReadonly(target: unknown): unknown {
  return createProxy(target, shallowReadonlyHandlers, shallowReadonlyCache)
}

export function readonly<T extends PlainObject>(target: T): ReadonlyReactive<T>
export function readonly<T extends readonly unknown[]>(target: T): ReadonlyReactive<T>
export function readonly<T>(target: T): ReadonlyReactive<T>

export function readonly(target: unknown): unknown {
  return createProxy(target, readonlyHandlers, readonlyCache)
}

/**
 * 判断给定值是否为 reactive 生成的 Proxy。
 *
 * @public
 */
export function isReactive(target: unknown): target is ReactiveTarget {
  if (!isObject(target)) {
    /* 原始值或 null 直接排除，保持与 reactive 的短路一致。 */
    return false
  }

  if (!isSupportedTarget(target)) {
    /* Map/Set 等未支持的结构不可视为 reactive。 */
    return false
  }

  return (target as ReactiveTarget)[reactiveFlag] === true
}

/**
 * 判断给定值是否为 readonly 生成的 Proxy。
 *
 * @public
 */
export function isReadonly(target: unknown): target is ReactiveTarget {
  if (!isObject(target)) {
    return false
  }

  if (!isSupportedTarget(target)) {
    return false
  }

  return (target as ReactiveTarget)[readonlyFlag] === true
}
