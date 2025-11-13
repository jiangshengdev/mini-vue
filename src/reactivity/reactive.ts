import { mutableHandlers } from './baseHandlers.ts'
import { isObject } from './utils.ts'

/**
 * 保存原始对象与其代理之间的映射，避免重复创建 Proxy
 */
const rawToReactiveMap = new WeakMap<object, object>()
/**
 * 保存代理到原始对象的映射，保证对代理再调用 reactive 时原样返回
 */
const reactiveToRawMap = new WeakMap<object, object>()

/**
 * 创建并缓存目标对象的响应式代理
 */
function createReactiveObject(target: Record<PropertyKey, unknown>): object {
  const existingProxy = rawToReactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  if (reactiveToRawMap.has(target)) {
    return target
  }

  const proxy = new Proxy(target, mutableHandlers)

  rawToReactiveMap.set(target, proxy)
  reactiveToRawMap.set(proxy, target)

  return proxy
}

/**
 * 将普通对象转换为响应式 Proxy；当前仅支持纯对象
 */
export function reactive<T extends object>(target: T): T
export function reactive<T>(target: T): T
export function reactive(target: unknown) {
  if (!isObject(target)) {
    return target
  }
  if (reactiveToRawMap.has(target as object)) {
    return target
  }
  if (Array.isArray(target)) {
    throw new TypeError('当前 reactive 仅支持普通对象，数组暂未实现')
  }
  return createReactiveObject(target as Record<PropertyKey, unknown>)
}
