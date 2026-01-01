/**
 * 提供 `reactive`/`readonly`/`shallowReactive`/`shallowReadonly` 四种响应式代理创建函数。
 *
 * @remarks
 * - 统一在此文件内复用缓存与创建逻辑，确保同一原始对象只创建一个代理。
 * - 不同代理类型使用独立的缓存，避免相互干扰。
 */
import type { ReactiveRawTarget, ReactiveTarget } from './contracts/index.ts'
import { rawKey, reactiveFlag, readonlyFlag } from './contracts/index.ts'
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers,
} from './internals/index.ts'
import { isRef } from './ref/api.ts'
import type { Reactive, ReadonlyReactive } from './types.ts'
import { reactivityUnsupportedType } from '@/messages/index.ts'
import { __DEV__, collectDevtoolsSetupState, isObject, isPlainObject } from '@/shared/index.ts'

/** 响应式代理缓存类型：使用 WeakMap 避免内存泄漏。 */
type ProxyCache = WeakMap<object, ReactiveTarget>

/** `reactive` 代理缓存。 */
const reactiveCache: ProxyCache = new WeakMap()

/** `readonly` 代理缓存。 */
const readonlyCache: ProxyCache = new WeakMap()

/** `shallowReactive` 代理缓存。 */
const shallowReactiveCache: ProxyCache = new WeakMap()

/** `shallowReadonly` 代理缓存。 */
const shallowReadonlyCache: ProxyCache = new WeakMap()

const enum TargetType {
  invalid,
  common,
}

function warnUnsupportedTarget(api: string, target: unknown): void {
  if (!__DEV__) {
    return
  }

  console.warn(reactivityUnsupportedType, {
    api,
    target,
  })
}

function getTargetType(target: object): TargetType {
  if (!Object.isExtensible(target)) {
    return TargetType.invalid
  }

  if (isRef(target)) {
    return TargetType.common
  }

  if (Array.isArray(target) || isPlainObject(target)) {
    return TargetType.common
  }

  return TargetType.invalid
}

/**
 * 从可能的代理对象中提取原始目标，若未代理则返回自身。
 */
function toRawTarget(target: object): object {
  return (target as ReactiveTarget)[rawKey] ?? target
}

/**
 * 确定 Proxy 使用的基础目标：
 * - readonly 包裹 reactive 时直接使用已有 reactive 代理，便于 isReactive 透传。
 * - 其他场景使用提取出的原始目标，保持缓存键一致。
 */
function resolveBaseTarget(
  target: object,
  sourceTarget: object,
  isReadonly: boolean,
): ReactiveRawTarget {
  if (isReadonly && Reflect.get(target as ReactiveTarget, reactiveFlag) === true) {
    return target as ReactiveRawTarget
  }

  return sourceTarget as ReactiveRawTarget
}

/**
 * 创建响应式代理的内部实现，统一处理缓存、类型检查与代理创建。
 *
 * @param target - 要代理的目标对象
 * @param handlers - Proxy 处理器
 * @param cache - 代理缓存
 * @returns 代理对象，若目标不支持代理则返回原值
 */
function createReactiveObject(
  target: unknown,
  handlers: ProxyHandler<ReactiveRawTarget>,
  cache: ProxyCache,
  { api, isReadonly, collectDevtools = false }: { api: string; isReadonly: boolean; collectDevtools?: boolean },
): unknown {
  if (!isObject(target)) {
    warnUnsupportedTarget(api, target)

    return target
  }

  const sourceTarget = toRawTarget(target)
  const baseTarget = resolveBaseTarget(target, sourceTarget, isReadonly)

  if (!isReadonly && Reflect.get(target as ReactiveTarget, readonlyFlag) === true) {
    return target
  }

  if (!isReadonly && Reflect.get(target as ReactiveTarget, reactiveFlag) === true) {
    return target
  }

  const cached = cache.get(sourceTarget)

  if (cached) {
    return cached
  }

  if (getTargetType(sourceTarget) === TargetType.invalid) {
    warnUnsupportedTarget(api, target)

    return target
  }

  const proxy = new Proxy(baseTarget, handlers)

  cache.set(sourceTarget, proxy)

  if (__DEV__ && collectDevtools && !isReadonly) {
    collectDevtoolsSetupState(proxy, api)
  }

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
  return createReactiveObject(target, mutableHandlers, reactiveCache, {
    api: 'reactive',
    isReadonly: false,
    collectDevtools: true,
  })
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
  return createReactiveObject(target, shallowReactiveHandlers, shallowReactiveCache, {
    api: 'shallowReactive',
    isReadonly: false,
    collectDevtools: true,
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
  return createReactiveObject(target, shallowReadonlyHandlers, shallowReadonlyCache, {
    api: 'shallowReadonly',
    isReadonly: true,
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
  return createReactiveObject(target, readonlyHandlers, readonlyCache, {
    api: 'readonly',
    isReadonly: true,
  })
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

  if (Reflect.get(target as ReactiveTarget, readonlyFlag) === true) {
    const raw = (target as ReactiveTarget)[rawKey]

    if (raw && raw !== target) {
      return isReactive(raw)
    }
  }

  return Reflect.get(target as ReactiveTarget, reactiveFlag) === true
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

  if (Reflect.get(target as ReactiveTarget, readonlyFlag) === true) {
    return true
  }

  const raw = (target as ReactiveTarget)[rawKey]

  if (raw && raw !== target) {
    return isReadonly(raw)
  }

  return false
}
