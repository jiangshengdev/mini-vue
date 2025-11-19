/**
 * 判断传入值是否为可供 reactive 使用的普通非 null 对象。
 */
export function isObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}

export function isPlainObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  if (!isObject(value)) {
    return false
  }

  const prototype: unknown = Object.getPrototypeOf(value)

  return prototype === null || prototype === Object.prototype
}

/**
 * 判断传入值是否为 null 或 undefined。
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined
}
