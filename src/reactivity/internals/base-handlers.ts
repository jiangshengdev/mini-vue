import { reactive } from '../reactive.ts'
import type { ReactiveTarget } from '../contracts/index.ts'
import { iterateDependencyKey, triggerOpTypes } from '../contracts/index.ts'
import { isRef } from '../ref/api.ts'
import { track, trigger } from './operations.ts'
import { isArrayIndex, isObject } from '@/shared/index.ts'

/**
 * 响应式读取逻辑：在取值时触发依赖收集，并对嵌套对象递归创建代理。
 */
const mutableGet: ProxyHandler<ReactiveTarget>['get'] = (target, key, receiver) => {
  /* 使用 Reflect 读取原始值，保持与原生访问一致的 this 绑定与行为 */
  const rawValue = Reflect.get(target, key, receiver) as unknown

  /* 读取属性同时收集依赖，连接目标字段与当前副作用 */
  track(target, key)

  if (isRef(rawValue)) {
    /* 数组索引上的 Ref 保持原样返回，其余场景自动解包 */
    if (Array.isArray(target) && isArrayIndex(key)) {
      return rawValue
    }

    return rawValue.value
  }

  if (isObject(rawValue)) {
    /* 对嵌套对象进行懒加载代理，避免初始化时递归遍历 */
    return reactive(rawValue)
  }

  return rawValue
}

/**
 * 响应式写入逻辑：仅在值实际变更时触发依赖更新。
 */
const mutableSet: ProxyHandler<ReactiveTarget>['set'] = (target, key, value, receiver) => {
  /* 数组的新增与修改需要依赖索引判断，普通对象则通过 hasOwn 区分逻辑分支。 */
  const targetIsArray = Array.isArray(target)
  const keyIsArrayIndex = isArrayIndex(key)
  const hadKey =
    targetIsArray && keyIsArrayIndex ? Number(key) < target.length : Object.hasOwn(target, key)

  /* 读取旧值用于后续的同值判断 */
  const previousValue = Reflect.get(target, key, receiver) as unknown
  /* 调用 Reflect 完成赋值，确保符合原生语义 */
  const wasApplied = Reflect.set(target, key, value, receiver)

  /* 赋值可能因为只读属性或代理限制而失败，此时无需触发依赖。 */
  if (!wasApplied) {
    return false
  }

  /* 除首写场景外保持 set 逻辑，新增字段统一触发 add 依赖。 */
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

/**
 * 拦截 delete 操作，确保删除成功后触发对应依赖。
 */
const mutableDeleteProperty: ProxyHandler<ReactiveTarget>['deleteProperty'] = (target, key) => {
  /* 删除前记录字段是否存在，后续只对真实变更触发更新。 */
  const hadKey = Object.hasOwn(target, key)
  /* 通过 Reflect 删除属性以保持原生行为一致。 */
  const wasApplied = Reflect.deleteProperty(target, key)

  if (wasApplied && hadKey) {
    /* 仅在确实移除既有字段时通知依赖，避免重复触发。 */
    trigger(target, key, triggerOpTypes.delete)
  }

  return wasApplied
}

/** 拦截 in 操作，确保查询同样建立依赖。 */
const mutableHas: ProxyHandler<ReactiveTarget>['has'] = (target, key) => {
  /* 复用 Reflect.has 获取布尔结果，与原生语义一致。 */
  const result = Reflect.has(target, key)

  /* `in` 查询也会读取属性，因此需要收集依赖。 */
  track(target, key)

  return result
}

/** `ownKeys` 捕获 for...in/Object.keys 等场景以追踪结构性更改。 */
const mutableOwnKeys: ProxyHandler<ReactiveTarget>['ownKeys'] = (target) => {
  /* 数组结构依赖 length，普通对象使用 iterateDependencyKey 作为统一标识。 */
  const key = Array.isArray(target) ? 'length' : iterateDependencyKey

  /* 遍历行为会关注集合结构是否变化，需要记录相应依赖。 */
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
