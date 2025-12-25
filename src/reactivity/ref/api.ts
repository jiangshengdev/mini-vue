import { refFlag } from '../contracts/index.ts'
import { withoutTracking } from '../internals/tracking.ts'
import { isReactive } from '../reactive.ts'
import { toRaw } from '../to-raw.ts'
import { ObjectRefImpl, RefImpl } from './impl.ts'
import type { Ref } from './types.ts'
import type { PlainObject } from '@/shared/index.ts'
import { isObject } from '@/shared/index.ts'

/**
 * 将任意值转换为 Ref，若已经是 Ref 则原样返回。
 *
 * @param value - 要转换的值，可以是普通值或已有的 Ref
 * @returns Ref 实例
 *
 * @remarks
 * - 若传入的值已是 Ref，会直接返回以保持引用稳定。
 * - 若传入的值是对象或数组，内部会被转换为 reactive 代理。
 *
 * @public
 */
export function ref<T>(value: T | Ref<T>): Ref<T> {
  /* 避免对现有 `Ref` 重新包装，保持引用稳定。 */
  if (isRef(value)) {
    return value
  }

  return new RefImpl(value)
}

/**
 * 判断传入的值是否为 Ref 实例。
 *
 * @param value - 要检查的值
 * @returns 若为 Ref 则返回 `true`
 *
 * @remarks
 * - 通过检查 `refFlag` 符号属性判断，该属性由 Ref 实现类提供。
 * - 非对象值直接返回 `false`。
 *
 * @public
 */
export function isRef<T>(value: unknown): value is Ref<T> {
  /* 通过 `refFlag` 符号位识别 `Ref`，其他结构一律返回 `false`。 */
  if (!isObject(value)) {
    return false
  }

  return Object.hasOwn(value, refFlag)
}

/**
 * 读取 Ref 的内部值，若为普通值则直接返回原值。
 *
 * @param value - Ref 或普通值
 * @returns Ref 的 value 属性值，或原值本身
 *
 * @remarks
 * - 常用于需要同时处理 Ref 和普通值的场景。
 *
 * @public
 */
export function unref<T>(value: T | Ref<T>): T {
  /* `Ref` 返回 `value` 属性，普通值保持不变。 */
  return isRef(value) ? value.value : value
}

/**
 * 针对对象的指定属性创建 Ref，复用已有 Ref 或包装成 getter/setter。
 *
 * @param target - 目标对象
 * @param key - 属性键
 * @returns 指向目标属性的 Ref
 *
 * @remarks
 * - 若属性已是 Ref，会直接返回以保持响应式关系。
 * - 若目标对象是 reactive 代理，读写会直接代理到原对象属性上，复用 reactive 的依赖收集。
 * - 若目标对象是普通对象，会创建本地依赖集合以支持响应式。
 *
 * @public
 */
export function toRef<T extends PlainObject, K extends keyof T>(target: T, key: K): Ref<T[K]> {
  /*
   * 创建阶段只做一次「是否为 `Ref`」的探测。
   *
   * @remarks
   * - 使用 `rawTarget` 避免 `reactive` 对 `Ref` 的自动解包，保证能正确复用原 `Ref`。
   * - 使用 `withoutTracking` 避免在 `effect` 中创建 `toRef` 时，把这次探测读取误收集为依赖。
   */
  const rawTarget = toRaw(target)
  const existing = withoutTracking(() => {
    return rawTarget[key] as unknown
  })

  /* 属性已是 `Ref` 时直接复用，避免丢失响应式关系。 */
  if (isRef(existing)) {
    return existing as Ref<T[K]>
  }

  const isTargetReactive = isReactive(target)

  /* 否则创建新的 `ObjectRefImpl`，将读写直接代理到原对象属性上。 */
  return new ObjectRefImpl(target, key, !isTargetReactive)
}
