import type { Ref } from './ref'
import type { PlainObject } from '@/shared/index.ts'

/**
 * 基础原始值类型：在类型层面保持原样，不参与深层解包。
 */
// eslint-disable-next-line @typescript-eslint/no-restricted-types
type Primitive = string | number | boolean | bigint | symbol | null | undefined

/**
 * 通用函数签名类型：用于识别「可调用值」，避免使用不安全的 `Function` 顶级类型。
 */
type UnknownFn = (...args: unknown[]) => unknown

/**
 * 解包递归的终止类型集合。
 *
 * @remarks
 * 命中这些类型时直接返回自身，避免在类型系统中展开过深。
 */
type UnwrapBailTypes = Primitive | UnknownFn

/**
 * Ref 解包入口：仅在「对象属性」场景对 Ref 进行解包。
 *
 * @remarks
 * - `T` 为 Ref 时解包为其 `value` 的类型，并继续递归。
 * - 非 Ref 则直接走递归解包逻辑。
 */
type UnwrapRef<T> = T extends Ref<infer V> ? UnwrapRefRecursive<V> : UnwrapRefRecursive<T>

/**
 * 递归解包逻辑：尽量对齐 reactive 的运行时读取行为。
 *
 * @remarks
 * - 遇到 `Ref` 直接 bail：使「数组索引上的 Ref 不自动解包」。
 * - 对象属性走 `UnwrapRef`：使「对象属性为 Ref 时会自动解包」。
 */
type UnwrapRefRecursive<T> = T extends UnwrapBailTypes | Ref
  ? T
  : T extends readonly unknown[]
    ? { [K in keyof T]: UnwrapRefRecursive<T[K]> }
    : T extends PlainObject
      ? { [K in keyof T]: UnwrapRef<T[K]> }
      : T

/**
 * `reactive` 的顶层解包策略：顶层若本身是 Ref，则保持 Ref 不被解包。
 */
type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefRecursive<T>

/**
 * `reactive` 返回值的类型投射：
 * - 深层代理对象结构
 * - 对象属性 Ref 解包
 * - 数组索引 Ref 保持 Ref
 */
export type Reactive<T> = UnwrapNestedRefs<T>

/** 深度只读工具类型，保留内建值与 Ref 原样，其余递归只读。 */
export type DeepReadonly<T> = T extends UnwrapBailTypes | Ref
  ? T
  : { readonly [K in keyof T]: DeepReadonly<T[K]> }

/** `readonly` 返回值的类型投射：在解包 Ref 后做深层只读。 */
export type ReadonlyReactive<T> = DeepReadonly<UnwrapNestedRefs<T>>
