export type PlainObject = Record<PropertyKey, unknown>

/**
 * 组件 props 的通用字典类型，约束键名为字符串。
 *
 * @beta
 */
export type PropsShape = Record<string, unknown>
