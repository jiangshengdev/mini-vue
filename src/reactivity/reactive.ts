/**
 * 提供 reactive 工具函数，负责缓存并复用响应式 Proxy 实例。
 */
import { mutableHandlers } from './internals/baseHandlers.ts'
import { isObject } from './shared/utils.ts'

/**
 * 保存原始对象与其代理之间的映射，避免重复创建 Proxy。
 */
const rawToReactiveMap = new WeakMap<object, object>()
/**
 * 保存代理到原始对象的映射，保证对代理再调用 reactive 时原样返回。
 */
const reactiveToRawMap = new WeakMap<object, object>()

/**
 * 创建并缓存目标对象的响应式代理。
 */
function createReactiveObject(target: Record<PropertyKey, unknown>): object {
  // 若已创建过代理则复用原实例，避免重复包装
  const existingProxy = rawToReactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 传入本就为代理时直接返回，保持幂等
  if (reactiveToRawMap.has(target)) {
    return target
  }

  // 通过 Proxy 拦截读写，配合 mutableHandlers 完成响应式转换
  const proxy = new Proxy(target, mutableHandlers)

  // 建立原始对象与代理的双向索引，避免重复创建代理实例
  rawToReactiveMap.set(target, proxy)
  reactiveToRawMap.set(proxy, target)

  return proxy
}

/**
 * 将普通对象转换为响应式 Proxy；当前仅支持纯对象。
 */
export function reactive<T extends object>(target: T): T
export function reactive<T>(target: T): T
export function reactive(target: unknown) {
  if (!isObject(target)) {
    // 非对象类型不具备响应式语义，按原值返回
    return target
  }
  // 暂不支持数组结构，保留显式错误提示
  if (Array.isArray(target)) {
    throw new TypeError('当前 reactive 仅支持普通对象，数组暂未实现')
  }
  if (reactiveToRawMap.has(target as object)) {
    // 避免对响应式对象再次包装
    return target
  }
  const recordTarget = target as Record<PropertyKey, unknown>
  // 由工厂函数处理缓存逻辑与 Proxy 创建细节
  return createReactiveObject(recordTarget)
}
