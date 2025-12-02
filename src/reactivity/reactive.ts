/**
 * 提供 reactive 工具函数，负责缓存并复用响应式 Proxy 实例。
 */
import { mutableHandlers } from './internals/base-handlers.ts'
import type { ReactiveTarget } from './shared/types.ts'
import { isObject, isPlainObject } from '@/shared/utils.ts'

/**
 * 封装原对象与代理实例之间的双向缓存。
 */
class ReactiveCache {
  /**
   * 缓存原始对象到代理对象的映射，便于复用同一 Proxy。
   */
  private readonly rawToReactive = new WeakMap<ReactiveTarget, ReactiveTarget>()

  /**
   * 缓存代理对象到原始对象的映射，支持反查判定。
   */
  private readonly reactiveToRaw = new WeakMap<ReactiveTarget, ReactiveTarget>()

  /**
   * 查找目标是否已被代理，避免重复创建 Proxy 实例。
   */
  getCachedProxy(target: ReactiveTarget): ReactiveTarget | undefined {
    if (this.reactiveToRaw.has(target)) {
      return target
    }

    return this.rawToReactive.get(target)
  }

  /**
   * 为给定对象创建新的响应式代理，并记录双向映射。
   */
  create(target: ReactiveTarget): ReactiveTarget {
    const proxy = new Proxy(target, mutableHandlers)

    this.rawToReactive.set(target, proxy)
    this.reactiveToRaw.set(proxy, target)

    return proxy
  }

  /**
   * 判断传入对象是否为缓存中的响应式 Proxy。
   */
  isReactive(target: ReactiveTarget): boolean {
    return this.reactiveToRaw.has(target)
  }
}

const reactiveCache = new ReactiveCache()
const unsupportedTypeMessage = 'reactive 目前仅支持普通对象或数组'

/**
 * 将普通对象或数组转换为响应式 Proxy。
 */
export function reactive<T extends Record<PropertyKey, unknown>>(target: T): T
export function reactive<T>(target: T[]): T[]
export function reactive<T>(target: T): T

export function reactive(target: unknown): unknown {
  /* 非对象值无法建立响应式代理，直接返回原值 */
  if (!isObject(target)) {
    return target
  }

  const targetIsArray = Array.isArray(target)

  /* 当前实现仅支持普通对象与数组，其它原生对象直接报错 */
  if (!targetIsArray && !isPlainObject(target)) {
    throw new TypeError(unsupportedTypeMessage, { cause: target })
  }

  const reactiveTarget = target as ReactiveTarget
  const cached = reactiveCache.getCachedProxy(reactiveTarget)

  if (cached) {
    /* 命中缓存即复用已有代理，保持依赖与副作用的一致性。 */
    return cached
  }

  /* 未命中缓存时创建新代理并登记映射 */
  return reactiveCache.create(reactiveTarget)
}

/**
 * 判断给定值是否为 reactive 生成的 Proxy。
 */
export function isReactive(target: unknown): target is ReactiveTarget {
  if (!isObject(target)) {
    /* 原始值或 null 直接排除，避免错误判定。 */
    return false
  }

  const targetIsArray = Array.isArray(target)
  const targetIsPlainObject = isPlainObject(target)

  if (!targetIsArray && !targetIsPlainObject) {
    /* Map/Set 等未支持的结构不可视为 reactive。 */
    return false
  }

  return reactiveCache.isReactive(target as ReactiveTarget)
}
