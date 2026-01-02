/**
 * 跨子域共享的基础判定与类型守卫工具，集中收敛常见的校验逻辑。
 * 覆盖对象/纯对象/空值/数组索引/thenable 等热路径判断，避免各子域重复实现。
 * 设计为无副作用的纯函数，可直接用于运行时分支与类型收窄。
 */
import type { PlainObject } from './types.ts'

/**
 * 判断传入值是否为可供 reactive 使用的普通非 null 对象。
 *
 * @param value - 待检测的值
 * @returns 当值为非 null 对象时返回 true
 */
export function isObject(value: unknown): value is PlainObject {
  /* Proxy 仅接受 object/array，因此需要显式过滤掉 null。 */
  return typeof value === 'object' && value !== null
}

/**
 * 判断对象是否以 Object.prototype 或 null 作为原型，过滤出纯对象。
 *
 * @param value - 待检测的值
 * @returns 当对象原型为 Object.prototype 或 null 时返回 true
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
 *
 * @param value - 待检测的值
 * @returns 为 null 或 undefined 时返回 true
 */
// eslint-disable-next-line @typescript-eslint/no-restricted-types
export function isNil(value: unknown): value is null | undefined {
  /* 与 looseEqual 不同，这里只接受严格 null/undefined。 */
  return value === null || value === undefined
}

/**
 * 判断属性键是否为非负整数索引，兼容 string/number 形式。
 *
 * @param key - 待检测的属性键
 * @returns 若属性键可视为合法数组索引则返回 true
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

/**
 * 判断 runner 的返回值是否为 Promise/thenable。
 *
 * @remarks
 * 错误通道只覆盖同步执行路径：一旦允许 thenable 返回，会导致异常可能在异步阶段漏报，
 * 且 finally 钩子会提前执行，从而破坏调用方对清理时序的预期。
 *
 * @param value - 待检测的返回值
 * @returns 若值符合 Promise/thenable 形态则返回 true
 */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  /* Promise/thenable 规范允许对象或携带 then 方法的函数，需兼容两者形态。 */
  if (typeof value !== 'function' && !isObject(value)) {
    return false
  }

  const candidate = value as { then?: unknown }
  const maybeThen = candidate.then

  return 'then' in candidate && typeof maybeThen === 'function'
}
