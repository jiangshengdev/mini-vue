/**
 * 提供 `reactive`/`readonly`/`shallowReactive`/`shallowReadonly` 四种响应式代理创建函数。
 *
 * @remarks
 * - 统一在此文件内复用缓存与创建逻辑，确保同一原始对象只创建一个代理。
 * - 不同代理类型使用独立的缓存，避免相互干扰。
 */
import type { ReactiveRawTarget, ReactiveTarget } from './contracts/index.ts'
import { reactiveFlag, readonlyFlag } from './contracts/index.ts'
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers,
} from './internals/index.ts'
import { isSupportedTarget } from './to-raw.ts'
import type { Reactive, ReadonlyReactive } from './types.ts'
import { reactivityUnsupportedType } from '@/messages/index.ts'
import { isObject } from '@/shared/index.ts'

/** 响应式代理缓存类型：使用 WeakMap 避免内存泄漏。 */
type ProxyCache = WeakMap<ReactiveRawTarget, ReactiveTarget>

/** `reactive` 代理缓存。 */
const reactiveCache: ProxyCache = new WeakMap()

/** `readonly` 代理缓存。 */
const readonlyCache: ProxyCache = new WeakMap()

/** `shallowReactive` 代理缓存。 */
const shallowReactiveCache: ProxyCache = new WeakMap()

/** `shallowReadonly` 代理缓存。 */
const shallowReadonlyCache: ProxyCache = new WeakMap()

/**
 * 创建响应式代理的内部实现，统一处理缓存、类型检查与代理创建。
 *
 * @param target - 要代理的目标对象
 * @param handlers - Proxy 处理器
 * @param cache - 代理缓存
 * @param options - 可选配置，控制是否跳过已代理对象的检查
 * @returns 代理对象，若目标不支持代理则返回原值
 */
function createProxy(
  target: unknown,
  handlers: ProxyHandler<ReactiveRawTarget>,
  cache: ProxyCache,
  {
    skipReactiveCheck = false,
    skipReadonlyCheck = false,
  }: { skipReactiveCheck?: boolean; skipReadonlyCheck?: boolean } = {},
): unknown {
  /* 非对象值无法建立响应式代理，直接返回原值 */
  if (!isObject(target)) {
    return target
  }

  /* 可选跳过已代理对象，保持 reactive/shallowReactive 的幂等性。 */
  if (skipReactiveCheck && (target as ReactiveTarget)[reactiveFlag] === true) {
    return target
  }

  if (skipReadonlyCheck && (target as ReactiveTarget)[readonlyFlag] === true) {
    return target
  }

  /* 当前实现仅支持普通对象与数组，其它原生对象直接报错 */
  if (!isSupportedTarget(target)) {
    throw new TypeError(reactivityUnsupportedType, { cause: target })
  }

  const reactiveTarget = target as ReactiveRawTarget
  const cached = cache.get(reactiveTarget)

  if (cached) {
    /* 命中缓存即复用已有代理，保持依赖与副作用的一致性。 */
    return cached
  }

  /* 未命中缓存时创建新代理并登记映射 */
  const proxy = new Proxy(reactiveTarget, handlers)

  cache.set(reactiveTarget, proxy)

  return proxy
}

/**
 * 将普通对象或数组转换为深层响应式 Proxy。
 *
 * @param target - 要转换的目标对象
 * @returns 响应式代理对象
 *
 * @remarks
 * - 对象属性中的 Ref 会被自动解包（数组索引上的 Ref 除外）。
 * - 嵌套对象会在访问时懒代理，而非一次性递归创建。
 * - 同一原始对象多次调用会返回同一代理实例。
 *
 * @public
 */
export function reactive<T extends ReactiveRawTarget>(target: T): Reactive<T>
/**
 * @public
 */
export function reactive<T extends readonly unknown[]>(target: T): Reactive<T>
/**
 * @public
 */
export function reactive<T>(target: T): T

export function reactive(target: unknown): unknown {
  return createProxy(target, mutableHandlers, reactiveCache, { skipReactiveCheck: true })
}

/**
 * 将普通对象或数组转换为浅层响应式 Proxy。
 *
 * @param target - 要转换的目标对象
 * @returns 浅层响应式代理对象
 *
 * @remarks
 * - 仅代理顶层属性，嵌套对象保持原样不会被代理。
 * - 适用于性能敏感场景或不需要深层响应式的情况。
 */
export function shallowReactive<T extends ReactiveRawTarget>(target: T): T
export function shallowReactive<T extends readonly unknown[]>(target: T): T
export function shallowReactive<T>(target: T): T

export function shallowReactive(target: unknown): unknown {
  return createProxy(target, shallowReactiveHandlers, shallowReactiveCache, {
    skipReactiveCheck: true,
  })
}

/**
 * 将普通对象或数组转换为浅层只读 Proxy。
 *
 * @param target - 要转换的目标对象
 * @returns 浅层只读代理对象
 *
 * @remarks
 * - 仅顶层属性为只读，嵌套对象保持原样可写。
 * - 写入操作在开发态会触发警告。
 */
export function shallowReadonly<T extends ReactiveRawTarget>(target: T): Readonly<T>
export function shallowReadonly<T extends readonly unknown[]>(target: T): Readonly<T>
export function shallowReadonly<T>(target: T): Readonly<T>

export function shallowReadonly(target: unknown): unknown {
  return createProxy(target, shallowReadonlyHandlers, shallowReadonlyCache, {
    skipReadonlyCheck: true,
  })
}

/**
 * 将普通对象或数组转换为深层只读 Proxy。
 *
 * @param target - 要转换的目标对象
 * @returns 深层只读代理对象
 *
 * @remarks
 * - 所有层级的属性都为只读，写入操作在开发态会触发警告。
 * - 嵌套对象会在访问时懒代理为只读。
 */
export function readonly<T extends ReactiveRawTarget>(target: T): ReadonlyReactive<T>
export function readonly<T extends readonly unknown[]>(target: T): ReadonlyReactive<T>
export function readonly<T>(target: T): ReadonlyReactive<T>

export function readonly(target: unknown): unknown {
  return createProxy(target, readonlyHandlers, readonlyCache, { skipReadonlyCheck: true })
}

/**
 * 判断给定值是否为 `reactive` 生成的 Proxy。
 *
 * @param target - 要检查的值
 * @returns 若为 reactive 代理则返回 `true`
 *
 * @remarks
 * - 通过读取 `reactiveFlag` 符号属性判断，该属性由 Proxy handler 动态返回。
 * - 原始值、null、不支持的对象类型（如 Map/Set）都返回 `false`。
 *
 * @public
 */
export function isReactive(target: unknown): target is ReactiveTarget {
  if (!isObject(target)) {
    /* 原始值或 null 直接排除，保持与 reactive 的短路一致。 */
    return false
  }

  if (!isSupportedTarget(target)) {
    /* Map/Set 等未支持的结构不可视为 reactive。 */
    return false
  }

  return (target as ReactiveTarget)[reactiveFlag] === true
}

/**
 * 判断给定值是否为 `readonly` 生成的 Proxy。
 *
 * @param target - 要检查的值
 * @returns 若为 readonly 代理则返回 `true`
 *
 * @remarks
 * - 通过读取 `readonlyFlag` 符号属性判断，该属性由 Proxy handler 动态返回。
 * - 原始值、null、不支持的对象类型（如 Map/Set）都返回 `false`。
 *
 * @public
 */
export function isReadonly(target: unknown): target is ReactiveTarget {
  if (!isObject(target)) {
    return false
  }

  if (!isSupportedTarget(target)) {
    return false
  }

  return (target as ReactiveTarget)[readonlyFlag] === true
}
