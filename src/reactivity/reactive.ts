/**
 * 提供 reactive 工具函数，负责缓存并复用响应式 Proxy 实例。
 */
import { mutableHandlers } from './internals/baseHandlers.ts'
import { isObject } from './shared/utils.ts'

/**
 * 封装原对象与代理实例之间的双向缓存。
 */
class ReactiveCache {
  /**
   * 缓存原始对象到代理对象的映射，便于复用同一 Proxy。
   */
  private readonly rawToReactive = new WeakMap<object, object>()
  /**
   * 缓存代理对象到原始对象的映射，支持反查判定。
   */
  private readonly reactiveToRaw = new WeakMap<object, object>()

  /**
   * 查找目标是否已被代理，避免重复创建 Proxy 实例。
   */
  getExisting(target: object) {
    if (this.reactiveToRaw.has(target)) {
      return target
    }
    return this.rawToReactive.get(target)
  }

  /**
   * 为给定对象创建新的响应式代理，并记录双向映射。
   */
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
  /* 非对象值无法建立响应式代理，直接返回原值 */
  if (!isObject(target)) {
    return target
  }
  /* 当前实现尚未覆盖数组代理，直接抛出友好错误 */
  if (Array.isArray(target)) {
    throw new TypeError(UNSUPPORTED_TYPE_MESSAGE)
  }

  /* 强制转换为记录类型，方便后续代理操作 */
  const objectTarget = target as Record<PropertyKey, unknown>
  const cached = reactiveCache.getExisting(objectTarget)
  if (cached) {
    /* 复用已有代理，确保同一原对象始终返回同一 Proxy */
    return cached as typeof target
  }

  /* 未命中缓存时创建新代理并登记映射 */
  return reactiveCache.create(objectTarget) as typeof target
}
