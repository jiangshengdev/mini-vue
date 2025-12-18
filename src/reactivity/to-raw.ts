import type { ReactiveTarget } from './contracts/index.ts'
import { rawFlag } from './contracts/index.ts'
import { isObject, isPlainObject } from '@/shared/index.ts'

/**
 * 判断目标是否为当前响应式实现支持的原生结构（普通对象或数组）。
 */
export function isSupportedTarget(target: unknown): target is ReactiveTarget {
  return Array.isArray(target) || isPlainObject(target)
}

/**
 * 获取响应式 Proxy 对应的原始对象。
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

  const raw = (target as ReactiveTarget)[rawFlag] as unknown

  return (raw ?? target) as T
}
