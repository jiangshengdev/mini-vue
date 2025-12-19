import type { ReactiveTarget } from '../contracts/index.ts'
import { iterateDependencyKey } from '../contracts/index.ts'
import { track } from '../internals/operations.ts'
import { toRaw } from '../to-raw.ts'

/**
 * 需要被特殊处理的数组「查询型」方法名集合。
 *
 * @remarks
 * - 这些方法会基于元素做相等性比较（identity-sensitive）。
 * - 响应式数组在读取元素时会懒代理对象，若直接调用原生实现会导致 raw/proxy 对比失败。
 */
export type ArrayIdentitySearchKey = 'includes' | 'indexOf' | 'lastIndexOf'

/**
 * 将数组方法的 this/参数/返回值完整对齐到原生签名，便于包装后仍保持类型精确。
 */
type ArrayIdentitySearchMethod<K extends ArrayIdentitySearchKey> = (
  this: unknown[],
  ...args: Parameters<unknown[][K]>
) => ReturnType<unknown[][K]>

/**
 * 缓存原生查询方法实现，避免每次取值都从原型链上动态读取。
 */
const nativeArraySearchMethods = {
  includes: ([] as unknown[]).includes,
  indexOf: ([] as unknown[]).indexOf,
  lastIndexOf: ([] as unknown[]).lastIndexOf,
} satisfies { [K in ArrayIdentitySearchKey]: ArrayIdentitySearchMethod<K> }

/**
 * 为 identity-sensitive 的数组查询方法创建包装，确保依赖收集与 raw/proxy 比较语义一致。
 */
function createIdentitySearchWrapper<K extends ArrayIdentitySearchKey>(
  key: K,
): ArrayIdentitySearchMethod<K> {
  return function arraySearchWrapper(
    this: unknown[],
    ...args: Parameters<unknown[][K]>
  ): ReturnType<unknown[][K]> {
    const rawArray = toRaw(this)

    // 查询行为关注数组元素集合的变化，使用 iterate 依赖统一收敛。
    track(rawArray as ReactiveTarget, iterateDependencyKey)

    const method = nativeArraySearchMethods[key] as ArrayIdentitySearchMethod<K>

    const result = method.call(rawArray, ...args)

    // `rawArray` 中存的是原始对象时：若用户用 proxy 作为入参，需要回退到 raw 入参再查一次。
    if (key === 'includes') {
      if (result === false) {
        return method.call(
          rawArray,
          ...(args.map((arg) => {
            return toRaw(arg)
          }) as Parameters<unknown[][K]>),
        )
      }

      return result
    }

    if (result === -1) {
      return method.call(
        rawArray,
        ...(args.map((arg) => {
          return toRaw(arg)
        }) as Parameters<unknown[][K]>),
      )
    }

    return result
  }
}

export const arraySearchWrappers = {
  includes: createIdentitySearchWrapper('includes'),
  indexOf: createIdentitySearchWrapper('indexOf'),
  lastIndexOf: createIdentitySearchWrapper('lastIndexOf'),
} satisfies { [K in ArrayIdentitySearchKey]: ArrayIdentitySearchMethod<K> }

/**
 * 判断某个属性 key 是否为需要特殊包装的数组查询方法。
 */
export function isArraySearchKey(key: PropertyKey): key is keyof typeof arraySearchWrappers {
  return typeof key === 'string' && Object.hasOwn(arraySearchWrappers, key)
}
