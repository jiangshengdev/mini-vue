import type { PlainObject } from './types.ts'

/**
 * 判断传入值是否为可供 reactive 使用的普通非 null 对象。
 */
export function isObject(value: unknown): value is PlainObject {
  /* Proxy 仅接受 object/array，因此需要显式过滤掉 null。 */
  return typeof value === 'object' && value !== null
}

/**
 * 判断对象是否以 Object.prototype 或 null 作为原型，过滤出纯对象。
 */
export function isPlainObject(value: unknown): value is PlainObject {
  if (!isObject(value)) {
    return false
  }

  /* 仅允许普通对象或无原型对象，以保证序列化语义稳定。 */
  const prototype: unknown = Reflect.getPrototypeOf(value)

  return prototype === null || prototype === Object.prototype
}

/**
 * 判断传入值是否为 null 或 undefined。
 */
export function isNil(value: unknown): value is null | undefined {
  /* 与 looseEqual 不同，这里只接受严格 null/undefined。 */
  return value === null || value === undefined
}

/**
 * 判断属性键是否为非负整数索引，兼容 string/number 形式。
 */
export function isArrayIndex(key: PropertyKey): boolean {
  /* `symbol` 键永远不会被视为索引，直接拒绝。 */
  if (typeof key === 'symbol') {
    return false
  }

  /* `number` 类型只需校验是否为非负整数。 */
  if (typeof key === 'number') {
    return Number.isInteger(key) && key >= 0
  }

  if (typeof key === 'string') {
    /* NaN、负号或空串都不视为合法索引。 */
    if (key === 'NaN' || key.length === 0 || key.startsWith('-')) {
      return false
    }

    const parsed = Number(key)

    /* 通过字符串化结果与原值比对，排除诸如 '01' 的情况。 */
    return Number.isInteger(parsed) && parsed >= 0 && String(parsed) === key
  }

  return false
}
