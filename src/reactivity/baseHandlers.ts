import { reactive } from './reactive.ts'
import { track, trigger } from './operations.ts'
import { isObject } from './utils.ts'

/**
 * 基础可变处理器，模仿 Vue 官方的 mutableHandlers，仅针对普通对象。
 */
const mutableGet: ProxyHandler<Record<PropertyKey, unknown>>['get'] = (
  target,
  key,
  receiver,
) => {
  const result = Reflect.get(target, key, receiver)
  track(target, key)
  if (isObject(result)) {
    return reactive(result as Record<PropertyKey, unknown>)
  }
  return result
}

const mutableSet: ProxyHandler<Record<PropertyKey, unknown>>['set'] = (
  target,
  key,
  value,
  receiver,
) => {
  const oldValue = Reflect.get(target, key, receiver)
  const didSet = Reflect.set(target, key, value, receiver)
  if (!Object.is(oldValue, value)) {
    trigger(target, key)
  }
  return didSet
}

export const mutableHandlers: ProxyHandler<Record<PropertyKey, unknown>> = {
  get: mutableGet,
  set: mutableSet,
}
