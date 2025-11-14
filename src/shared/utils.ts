/**
 * 判断传入值是否为可供 reactive 使用的普通非 null 对象。
 */
export function isObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}
