import { isReactive } from '../reactive.ts'
import { isRef } from '../ref/api.ts'
import type { WatchSource } from './core.ts'
import { isObject } from '@/shared/index.ts'

/**
 * 根据显式传参与源类型推导是否需要深度监听。
 */
export function resolveDeepOption(
  source: WatchSource<unknown>,
  explicit: boolean | undefined,
): boolean {
  /* 用户显式声明时直接返回，优先级最高。 */
  if (typeof explicit === 'boolean') {
    return explicit
  }

  /* `getter` 与 ref 默认只追踪自身引用，无需深度遍历。 */
  if (typeof source === 'function' || isRef(source)) {
    return false
  }

  /* 响应式对象推导为 true，以便追踪嵌套字段。 */
  if (isObject(source) && isReactive(source)) {
    return true
  }

  return false
}

/**
 * 按 deep 策略生成统一的 getter，供 effect 收集依赖。
 */
export function createGetter<T>(source: WatchSource<T>, deep: boolean): () => T {
  /* 函数源直接作为 getter 使用，保证懒读取。 */
  if (typeof source === 'function') {
    return source
  }

  /* `ref` 源在深度模式下递归读取 value，确保嵌套字段被追踪。 */
  if (isRef(source)) {
    return () => {
      if (deep) {
        return traverse(source.value)
      }

      return source.value
    }
  }

  if (isReactive(source)) {
    /* 深度监听时通过 traverse 递归触发每个字段的依赖。 */
    if (deep) {
      return () => {
        return traverse(source) as T
      }
    }

    /* 浅监听仅返回原对象，沿用 Proxy 的依赖收集。 */
    return () => {
      return source as T
    }
  }

  /* 普通对象在深度模式下仍需遍历一次，保持一致行为。 */
  return () => {
    if (deep) {
      traverse(source)
    }

    return source as T
  }
}

/**
 * 递归访问对象所有字段以触发依赖，避免循环引用导致死循环。
 */
function traverse<T>(target: T, seen = new Set<unknown>()): T {
  /* 非对象或已访问过的节点直接返回，防止无限递归。 */
  if (!isObject(target) || seen.has(target)) {
    return target
  }

  seen.add(target)

  /* 遇到 ref 时继续深入其 target，保持与响应式对象一致。 */
  if (isRef(target)) {
    traverse(target.value, seen)

    return target
  }

  /* 仅遍历可枚举自有键，包含字符串与 Symbol。 */
  for (const key of Reflect.ownKeys(target)) {
    if (Object.prototype.propertyIsEnumerable.call(target, key)) {
      traverse(target[key], seen)
    }
  }

  return target
}
