/**
 * 提供响应式代理的原始对象提取与类型判定工具。
 *
 * @remarks
 * - `isSupportedTarget` 用于运行时校验目标是否可创建代理。
 * - `toRaw` 递归拆出代理背后的原始对象，供序列化或比较等场景使用。
 */
import type { ReactiveRawTarget, ReactiveTarget } from './contracts/index.ts'
import { rawKey, refFlag } from './contracts/index.ts'
import { isObject, isPlainObject } from '@/shared/index.ts'

/**
 * 判断目标是否为当前响应式实现支持的原生结构。
 *
 * @param target - 要检查的值
 * @returns 若为普通对象、数组或 Ref 则返回 `true`
 *
 * @remarks
 * - 当前支持：普通对象（`isPlainObject`）、数组、Ref。
 * - 目标必须是可扩展对象（`Object.isExtensible` 为 true），否则无法安全挂载依赖与内部标记。
 * - Map、Set、WeakMap、WeakSet 等原生集合暂不支持。
 */
export function isSupportedTarget(target: unknown): target is ReactiveRawTarget {
  if (!isObject(target)) {
    return false
  }

  if (!Object.isExtensible(target)) {
    return false
  }

  if (Array.isArray(target) || isPlainObject(target)) {
    return true
  }

  return Object.hasOwn(target, refFlag)
}

/**
 * 获取响应式 Proxy 对应的原始对象。
 *
 * @param target - 可能是响应式代理的对象
 * @returns 原始对象，若非代理则返回原值
 *
 * @remarks
 * - 通过读取 `rawKey` 符号属性获取原始对象，该属性由 Proxy handler 动态返回。
 * - 原始值、null、不支持的对象类型会直接返回原值。
 * - 常用于需要操作原始对象的场景，如序列化、比较等。
 *
 * @public
 */
export function toRaw<T>(target: T): T {
  if (!isObject(target)) {
    return target
  }

  const raw = (target as ReactiveTarget)[rawKey] as unknown

  if (raw) {
    return toRaw(raw as T)
  }

  return target
}
