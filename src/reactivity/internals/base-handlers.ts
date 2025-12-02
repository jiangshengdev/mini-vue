import { reactive } from '../reactive.ts'
import { iterateKey, triggerOpTypes } from '../shared/constants.ts'
import type { ReactiveTarget } from '../shared/types.ts'
import { track, trigger } from './operations.ts'
import { hasOwn, isIntegerKey, isObject } from '@/shared/utils.ts'

/**
 * 响应式读取逻辑：在取值时触发依赖收集，并对嵌套对象递归创建代理。
 */
const mutableGet: ProxyHandler<ReactiveTarget>['get'] = (
  target,
  key,
  receiver,
) => {
  /* 使用 Reflect 读取原始值，保持与原生访问一致的 this 绑定与行为 */
  const rawValue = Reflect.get(target, key, receiver) as unknown

  /* 读取属性同时收集依赖，连接目标字段与当前副作用 */
  track(target, key)

  if (isObject(rawValue)) {
    /* 对嵌套对象进行懒加载代理，避免初始化时递归遍历 */
    return reactive(rawValue)
  }

  return rawValue
}

/**
 * 响应式写入逻辑：仅在值实际变更时触发依赖更新。
 */
const mutableSet: ProxyHandler<ReactiveTarget>['set'] = (
  target,
  key,
  value,
  receiver,
) => {
  const targetIsArray = Array.isArray(target)
  const keyIsInteger = isIntegerKey(key)
  const hadKey =
    targetIsArray && keyIsInteger
      ? Number(key) < target.length
      : hasOwn(target, key)

  /* 读取旧值用于后续的同值判断 */
  const previousValue = Reflect.get(target, key, receiver) as unknown
  /* 调用 Reflect 完成赋值，确保符合原生语义 */
  const applied = Reflect.set(target, key, value, receiver)

  if (!applied) {
    return false
  }

  if (!hadKey) {
    trigger(target, key, triggerOpTypes.add, value)

    return true
  }

  if (!Object.is(previousValue, value)) {
    /* 值发生实际变化时才通知依赖，规避无效触发 */
    trigger(target, key, triggerOpTypes.set, value)
  }

  return true
}

const mutableDeleteProperty: ProxyHandler<ReactiveTarget>['deleteProperty'] = (
  target,
  key,
) => {
  const hadKey = hasOwn(target, key)
  const applied = Reflect.deleteProperty(target, key)

  if (applied && hadKey) {
    trigger(target, key, triggerOpTypes.delete)
  }

  return applied
}

const mutableHas: ProxyHandler<ReactiveTarget>['has'] = (target, key) => {
  const result = Reflect.has(target, key)

  track(target, key)

  return result
}

const mutableOwnKeys: ProxyHandler<ReactiveTarget>['ownKeys'] = (target) => {
  const key = Array.isArray(target) ? 'length' : iterateKey

  track(target, key)

  return Reflect.ownKeys(target)
}

/**
 * 导出与 Vue 中 mutableHandlers 对齐的基础处理器，适配普通对象与数组。
 */
export const mutableHandlers = {
  get: mutableGet,
  set: mutableSet,
  deleteProperty: mutableDeleteProperty,
  has: mutableHas,
  ownKeys: mutableOwnKeys,
} satisfies ProxyHandler<ReactiveTarget>
