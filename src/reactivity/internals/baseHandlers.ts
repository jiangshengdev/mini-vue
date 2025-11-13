import { reactive } from '../reactive.ts'
import { track, trigger } from './operations.ts'
import { isObject } from '../shared/utils.ts'

/**
 * 响应式读取逻辑：在取值时触发依赖收集，并对嵌套对象递归创建代理。
 */
const mutableGet: ProxyHandler<Record<PropertyKey, unknown>>['get'] =
  function getReactiveValue(target, key, receiver) {
    // 使用 Reflect 读取原始值，确保 this 绑定与访问行为一致
    const rawValue = Reflect.get(target, key, receiver)
    // 读取属性时记录当前活跃副作用，建立响应式依赖关系
    track(target, key)
    if (isObject(rawValue)) {
      // 懒加载子对象的代理，避免提前遍历整棵对象树
      return reactive(rawValue as Record<PropertyKey, unknown>)
    }
    return rawValue
  }

/**
 * 响应式写入逻辑：仅在值实际变更时触发依赖更新。
 */
const mutableSet: ProxyHandler<Record<PropertyKey, unknown>>['set'] =
  function setReactiveValue(target, key, value, receiver) {
    // 保留旧值以便判断是否需要触发更新
    const previousValue = Reflect.get(target, key, receiver)
    // 让赋值逻辑仍由标准 Reflect 行为承担
    const applied = Reflect.set(target, key, value, receiver)
    if (!Object.is(previousValue, value)) {
      // 仅在值真正变化时触发依赖，避免无意义的重新执行
      trigger(target, key)
    }
    return applied
  }

/**
 * 导出与 Vue 中 mutableHandlers 对齐的基础处理器，仅面向普通对象。
 */
export const mutableHandlers = {
  get: mutableGet,
  set: mutableSet,
} satisfies ProxyHandler<Record<PropertyKey, unknown>>
