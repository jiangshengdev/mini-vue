/**
 * 判断传入值是否为普通对象
 */
export function isObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}
