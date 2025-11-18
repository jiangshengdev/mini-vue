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

  const prototype = Object.getPrototypeOf(value)

  return prototype === null || prototype === Object.prototype
}
