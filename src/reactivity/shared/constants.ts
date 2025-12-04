/**
 * `for...in`/`Object.keys` 依赖的统一标识，用于追踪结构性变更。
 */
export const iterateDependencyKey = Symbol('iterate')

/**
 * 标记对象具备 Ref 能力的内部符号，避免与用户属性冲突。
 */
export const refFlag = Symbol('isRef')

/**
 * 触发操作类型常量，与依赖注册时的行为保持一致。
 */
export const triggerOpTypes = {
  /** 修改已存在字段的赋值操作。 */
  set: 'set',
  /** 新增属性或数组索引。 */
  add: 'add',
  /** 删除已有字段。 */
  delete: 'delete',
} as const

/** 将触发常量映射为联合类型，便于类型推导。 */
export type TriggerOpType = (typeof triggerOpTypes)[keyof typeof triggerOpTypes]
