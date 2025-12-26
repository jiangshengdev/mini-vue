import type { ReactiveRawTarget, ReactiveTarget } from './contracts/index.ts'
import { rawKey } from './contracts/index.ts'
import { isObject, isPlainObject } from '@/shared/index.ts'

/**
 * 判断目标是否为当前响应式实现支持的原生结构。
 *
 * @param target - 要检查的值
 * @returns 若为普通对象或数组则返回 `true`
 *
 * @remarks
 * - 当前仅支持普通对象（`isPlainObject`）与数组。
 * - Map、Set、WeakMap、WeakSet 等原生集合暂不支持。
 */
export function isSupportedTarget(target: unknown): target is ReactiveRawTarget {
  return Array.isArray(target) || isPlainObject(target)
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

  if (!isSupportedTarget(target)) {
    return target
  }

  const raw = (target as ReactiveTarget)[rawKey] as unknown

  return (raw ?? target) as T
}
