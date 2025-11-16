import { reactive } from '../reactive.ts'
import { track, trigger } from './operations.ts'
import { isObject } from '@/shared/utils.ts'

/**
 * 响应式读取逻辑：在取值时触发依赖收集，并对嵌套对象递归创建代理。
 */
const mutableGet: ProxyHandler<Record<PropertyKey, unknown>>['get'] =
  function getReactiveValue(target, key, receiver) {
    /* 使用 Reflect 读取原始值，保持与原生访问一致的 this 绑定与行为 */
    const rawValue = Reflect.get(target, key, receiver)
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
const mutableSet: ProxyHandler<Record<PropertyKey, unknown>>['set'] =
  function setReactiveValue(target, key, value, receiver) {
    /* 读取旧值用于后续的同值判断 */
    const previousValue = Reflect.get(target, key, receiver)
    /* 调用 Reflect 完成赋值，确保符合原生语义 */
    const applied = Reflect.set(target, key, value, receiver)
    if (!Object.is(previousValue, value)) {
      /* 值发生实际变化时才通知依赖，规避无效触发 */
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
