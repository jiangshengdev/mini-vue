import { reactive } from './reactive.ts'
import { track, trigger } from './operations.ts'
import { isObject } from './utils.ts'

/**
 * 响应式读取逻辑：在取值时触发依赖收集，并对嵌套对象递归创建代理。
 */
const mutableGet: ProxyHandler<Record<PropertyKey, unknown>>['get'] = (
  target,
  key,
  receiver,
) => {
  const result = Reflect.get(target, key, receiver)
  // 读取属性时记录当前活跃副作用，建立响应式依赖关系
  track(target, key)
  if (isObject(result)) {
    // 懒加载子对象的代理，避免提前遍历整棵对象树
    return reactive(result as Record<PropertyKey, unknown>)
  }
  return result
}

/**
 * 响应式写入逻辑：仅在值实际变更时触发依赖更新。
 */
const mutableSet: ProxyHandler<Record<PropertyKey, unknown>>['set'] = (
  target,
  key,
  value,
  receiver,
) => {
  const oldValue = Reflect.get(target, key, receiver)
  const didSet = Reflect.set(target, key, value, receiver)
  if (!Object.is(oldValue, value)) {
    // 仅在值真正变化时触发依赖，避免无意义的重新执行
    trigger(target, key)
  }
  return didSet
}

/**
 * 导出与 Vue 中 mutableHandlers 对齐的基础处理器，仅面向普通对象。
 */
export const mutableHandlers = {
  get: mutableGet,
  set: mutableSet,
} satisfies ProxyHandler<Record<PropertyKey, unknown>>
