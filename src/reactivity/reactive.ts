/**
 * 提供 reactive 工具函数，负责缓存并复用响应式 Proxy 实例。
 */
import { mutableHandlers } from './internals/index.ts'
import type { ReactiveTarget } from './shared/index.ts'
import type { PlainObject } from '@/shared/index.ts'
import { isObject, isPlainObject } from '@/shared/index.ts'

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
    /* 已是代理对象时直接返回自身，避免重复包装。 */
    if (this.reactiveToRaw.has(target)) {
      return target
    }

    /* 原对象若命中缓存则复用已有代理。 */
    return this.rawToReactive.get(target)
  }

  /**
   * 为给定对象创建新的响应式代理，并记录双向映射。
   */
  create(target: ReactiveTarget): ReactiveTarget {
    /* 委托 mutableHandlers 处理 get/set 等拦截。 */
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
 * 判断传入目标是否为当前响应式系统支持的对象类型。
 */
function isSupportedTarget(target: unknown): target is ReactiveTarget {
  /* 目前仅对普通对象与数组启用响应式代理；isPlainObject 内含对象判定。 */
  return Array.isArray(target) || isPlainObject(target)
}

/**
 * 将普通对象或数组转换为响应式 Proxy。
 *
 * @public
 */
export function reactive<T extends PlainObject>(target: T): T
/**
 * @public
 */
export function reactive<T>(target: T[]): T[]
/**
 * @public
 */
export function reactive<T>(target: T): T

export function reactive(target: unknown): unknown {
  /* 非对象值无法建立响应式代理，直接返回原值 */
  if (!isObject(target)) {
    return target
  }

  /* 当前实现仅支持普通对象与数组，其它原生对象直接报错 */
  if (!isSupportedTarget(target)) {
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

  return reactiveCache.isReactive(target as ReactiveTarget)
}
