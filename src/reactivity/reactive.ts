/**
 * 提供 reactive 工具函数，负责缓存并复用响应式 Proxy 实例。
 */
import { mutableHandlers } from './internals/baseHandlers.ts'
import { isObject } from './shared/utils.ts'

/**
 * 封装原对象与代理实例之间的双向缓存。
 */
class ReactiveCache {
  private readonly rawToReactive = new WeakMap<object, object>()
  private readonly reactiveToRaw = new WeakMap<object, object>()

  getExisting(target: object) {
    if (this.reactiveToRaw.has(target)) {
      return target
    }
    return this.rawToReactive.get(target)
  }

  create(target: Record<PropertyKey, unknown>) {
    const proxy = new Proxy(target, mutableHandlers)
    this.rawToReactive.set(target, proxy)
    this.reactiveToRaw.set(proxy, target)
    return proxy
  }
}

const reactiveCache = new ReactiveCache()
const UNSUPPORTED_TYPE_MESSAGE = 'reactive 目前仅支持普通对象（不含数组）'

/**
 * 将普通对象转换为响应式 Proxy；当前仅支持纯对象。
 */
export function reactive<T extends object>(target: T): T
export function reactive<T>(target: T): T
export function reactive(target: unknown) {
  if (!isObject(target)) {
    return target
  }
  if (Array.isArray(target)) {
    throw new TypeError(UNSUPPORTED_TYPE_MESSAGE)
  }

  const objectTarget = target as Record<PropertyKey, unknown>
  const cached = reactiveCache.getExisting(objectTarget)
  if (cached) {
    return cached as typeof target
  }

  return reactiveCache.create(objectTarget) as typeof target
}
