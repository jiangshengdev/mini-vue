/**
 * 跨子域共享的基础类型定义，封装常用的字典与 props 形态约束。
 * 通过可选字段辅助类型减少上层重复拼接交叉类型，保持键类型语义一致。
 */

/**
 * 通用的对象字典类型，键可以是 string、number 或 symbol。
 */
export type PlainObject = Record<PropertyKey, unknown>

/**
 * 组件 props 的通用字典类型，约束键名为字符串。
 *
 * @beta
 */
export type PropsShape = Record<string, unknown>

/**
 * 为对象类型补充一个可选字段。
 *
 * @remarks
 * 主要用于把 `T & { key?: ... }` 这类交叉类型下沉到基础层，
 * 让上层代码只做语义表达而不直接拼接交叉类型。
 */
export type WithOptionalProp<T, K extends PropertyKey, V> = T & Partial<Record<K, V>>
