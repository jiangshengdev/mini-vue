/**
 * `for...in`/`Object.keys` 等遍历操作依赖的统一标识符。
 *
 * @remarks
 * - 当对象结构发生变化（新增/删除属性）时，需要触发依赖于该标识的副作用。
 * - 使用 Symbol 避免与用户属性冲突。
 */
export const iterateDependencyKey = Symbol('iterate')

/**
 * 标记对象具备 Ref 能力的内部符号，避免与用户属性冲突。
 */
export const refFlag = Symbol('isRef')

/**
 * 标记对象为 reactive 生成的代理。
 *
 * @remarks
 * - 使用 Symbol 避免与用户属性冲突。
 * - 该标记由 Proxy handler 提供，不会真实写入用户对象。
 */
export const reactiveFlag = Symbol('isReactive')

/**
 * 标记对象为 readonly 生成的代理。
 *
 * @remarks
 * - 由 Proxy handler 在读取该 Symbol 时返回布尔值。
 */
export const readonlyFlag = Symbol('isReadonly')

/**
 * 标记对象为浅层代理（shallowReactive/shallowReadonly）。
 *
 * @remarks
 * - 由 Proxy handler 在读取该 Symbol 时返回布尔值。
 * - 用于区分浅层/深层代理的行为差异（例如 readonly 的依赖追踪策略）。
 */
export const shallowFlag = Symbol('isShallow')

/**
 * 访问 reactive Proxy 对应的原始对象。
 *
 * @remarks
 * - 由 Proxy handler 拦截并返回 raw target。
 * - 用于实现 `toRaw`，避免依赖私有缓存做反查。
 */
export const rawKey = Symbol('raw')

/**
 * 触发操作类型常量，用于区分不同的响应式变更场景。
 *
 * @remarks
 * - 不同操作类型会影响依赖触发的范围，例如 `add` 会额外触发 `iterate` 依赖。
 * - 与 `track` 时的行为保持一致，确保依赖收集与触发的对称性。
 */
export const triggerOpTypes = {
  /** 修改已存在字段的赋值操作。 */
  set: 'set',
  /** 新增属性或数组索引。 */
  add: 'add',
  /** 删除已有字段。 */
  delete: 'delete',
} as const

/**
 * 将触发常量映射为联合类型，便于类型推导与约束。
 */
export type TriggerOpType = (typeof triggerOpTypes)[keyof typeof triggerOpTypes]
