import { isReactive } from '../reactive.ts'
import { ObjectRefImpl, RefImpl } from './impl.ts'
import type { Ref, RefMarker } from './types.ts'
import { REF_FLAG } from './types.ts'

/**
 * 将任意值转换为 Ref，若已经是 Ref 则原样返回。
 */
export function ref<T>(value: Ref<T>): Ref<T>
export function ref<T>(value: T): Ref<T>

export function ref<T>(value: T | Ref<T>): Ref<T> {
  /* 避免对现有 Ref 重新包装，保持引用稳定。 */
  if (isRef(value)) {
    return value
  }

  return new RefImpl(value)
}

/**
 * 判断传入的对象是否拥有 Ref 标记。
 */
export function isRef<T>(value: unknown): value is Ref<T> {
  /* 通过 REF_FLAG 符号位识别 Ref，其他结构一律返回 false。 */
  return Boolean(
    value && typeof value === 'object' && (value as RefMarker)[REF_FLAG],
  )
}

/**
 * 读取 Ref 的内部值，若为普通值则直接返回原值。
 */
export function unref<T>(value: T | Ref<T>): T {
  /* Ref 返回 value 属性，普通值保持不变。 */
  return isRef(value) ? value.value : value
}

/**
 * 针对对象的指定属性创建 Ref，复用已有 Ref 或包装成 getter/setter。
 */
export function toRef<
  T extends Record<PropertyKey, unknown>,
  K extends keyof T,
>(target: T, key: K): Ref<T[K]> {
  const existing = target[key]

  /* 属性已是 Ref 时直接复用，避免丢失响应式关系。 */
  if (isRef(existing)) {
    return existing as Ref<T[K]>
  }

  const isTargetReactive = isReactive(target)

  /* 否则创建新的 ObjectRefImpl，将读写直接代理到原对象属性上。 */
  return new ObjectRefImpl(target, key, !isTargetReactive)
}
