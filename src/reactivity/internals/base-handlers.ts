import {
  arraySearchWrappers,
  arrayUntrackedMutators,
  isArrayMutatorKey,
  isArraySearchKey,
} from '../array/index.ts'
import type { ReactiveRawTarget } from '../contracts/index.ts'
import {
  iterateDependencyKey,
  rawFlag,
  reactiveFlag,
  readonlyFlag,
  triggerOpTypes,
} from '../contracts/index.ts'
import { reactive, readonly } from '../reactive.ts'
import { isRef } from '../ref/api.ts'
import { track, trigger } from './operations.ts'
import { withoutTracking } from './tracking.ts'
import { reactivityReadonlyWarning } from '@/messages/index.ts'
import { __DEV__, isArrayIndex, isObject } from '@/shared/index.ts'

/** Proxy get 拦截器类型。 */
type Getter = ProxyHandler<ReactiveRawTarget>['get']

/**
 * 响应式 Proxy 的 get 拦截器工厂函数。
 *
 * @param isReadonly - 是否为只读代理
 * @param shallow - 是否为浅层代理
 * @returns Proxy get 拦截器
 *
 * @remarks
 * - 处理内部标记（reactiveFlag/readonlyFlag/rawFlag）的读取。
 * - 数组变更方法和查询方法会返回特殊包装版本。
 * - 深层模式下嵌套对象会被懒代理。
 * - 对象属性中的 Ref 会被自动解包（数组索引除外）。
 */
function createGetter(isReadonly: boolean, shallow: boolean): Getter {
  return (target, key, receiver) => {
    /* 读取内部标记不应触发依赖收集。 */
    if (key === reactiveFlag) {
      return !isReadonly
    }

    if (key === readonlyFlag) {
      return isReadonly
    }

    if (key === rawFlag) {
      return target
    }

    /*
     * 数组变更方法需要走「无依赖收集」的包装版本。
     *
     * @remarks
     * - 变更方法内部可能读取 length/索引等，这些读取属于实现细节，不应被 track 到用户 effect 上。
     * - 因此在代理层读取 `arr.push` 等方法时，直接返回包装后的函数实现。
     */
    if (Array.isArray(target) && isArrayMutatorKey(key)) {
      return arrayUntrackedMutators[key]
    }

    /*
     * 数组查询方法需要走「对 raw/proxy 兼容」的包装版本。
     *
     * @remarks
     * - 直接调用原生 includes/indexOf/lastIndexOf 会读取代理数组元素并进行 identity 对比。
     * - 元素读取会被懒代理，导致 `proxy !== raw`，从而出现查找失败。
     */
    if (Array.isArray(target) && isArraySearchKey(key)) {
      return arraySearchWrappers[key]
    }

    /* 使用 Reflect 读取原始值，保持与原生访问一致的 this 绑定与行为 */
    const rawValue = Reflect.get(target, key, receiver) as unknown

    /* 读取属性同时收集依赖，连接目标字段与当前副作用 */
    track(target, key)

    if (isRef(rawValue)) {
      if (isReadonly) {
        /* 只读模式保持 Ref 原样返回，不解包。 */
        return rawValue
      }

      /* 数组索引上的 Ref 保持原样返回，其余场景自动解包 */
      if (Array.isArray(target) && isArrayIndex(key)) {
        return rawValue
      }

      return rawValue.value
    }

    if (isObject(rawValue)) {
      /* `shallow` 直接返回原值，深层模式递归创建对应代理 */
      if (shallow) {
        return rawValue
      }

      return isReadonly ? readonly(rawValue) : reactive(rawValue)
    }

    return rawValue
  }
}

/**
 * 响应式写入逻辑：仅在值实际变更时触发依赖更新。
 *
 * @remarks
 * - 通过 `Object.is` 判等，避免无意义的触发。
 * - 区分新增（add）和修改（set）两种操作类型。
 * - 读取旧值时会禁用依赖收集，避免写入阶段意外建立依赖。
 */
const mutableSet: ProxyHandler<ReactiveRawTarget>['set'] = (target, key, value, receiver) => {
  /* 数组的新增与修改需要依赖索引判断，普通对象则通过 hasOwn 区分逻辑分支。 */
  const targetIsArray = Array.isArray(target)
  const keyIsArrayIndex = isArrayIndex(key)
  const hadKey =
    targetIsArray && keyIsArrayIndex ? Number(key) < target.length : Object.hasOwn(target, key)

  /*
   * 读取旧值仅用于后续的同值判断。
   *
   * @remarks
   * - 该读取属于写入流程的一部分，不应被视为「用户读取」。
   * - 若通过 receiver 触发了访问器 getter，getter 内部的 reactive 读取可能会把依赖收集到当前 effect。
   *   因此这里需要显式禁用依赖收集，避免出现「写入时意外建立依赖」。
   */
  const previousValue = withoutTracking(() => {
    return Reflect.get(target, key, receiver) as unknown
  })
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
 *
 * @remarks
 * - 仅在确实移除既有字段时通知依赖，避免重复触发。
 */
const mutableDeleteProperty: ProxyHandler<ReactiveRawTarget>['deleteProperty'] = (target, key) => {
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

/**
 * 拦截 `in` 操作符，确保查询同样建立依赖。
 */
const mutableHas: ProxyHandler<ReactiveRawTarget>['has'] = (target, key) => {
  /* 复用 Reflect.has 获取布尔结果，与原生语义一致。 */
  const result = Reflect.has(target, key)

  /* `in` 查询也会读取属性，因此需要收集依赖。 */
  track(target, key)

  return result
}

/**
 * 拦截 `ownKeys` 操作，捕获 `for...in`/`Object.keys` 等场景以追踪结构性更改。
 *
 * @remarks
 * - 数组结构依赖 `length`，普通对象使用 `iterateDependencyKey` 作为统一标识。
 */
const mutableOwnKeys: ProxyHandler<ReactiveRawTarget>['ownKeys'] = (target) => {
  /* 数组结构依赖 length，普通对象使用 iterateDependencyKey 作为统一标识。 */
  const key = Array.isArray(target) ? 'length' : iterateDependencyKey

  /* 遍历行为会关注集合结构是否变化，需要记录相应依赖。 */
  track(target, key)

  return Reflect.ownKeys(target)
}

/**
 * 只读代理的 set 拦截器：在开发态输出警告，始终返回 `true` 以避免抛出异常。
 */
const readonlySet: ProxyHandler<ReactiveRawTarget>['set'] = () => {
  if (__DEV__) {
    console.warn(reactivityReadonlyWarning)
  }

  return true
}

/**
 * 只读代理的 deleteProperty 拦截器：在开发态输出警告，始终返回 `true` 以避免抛出异常。
 */
const readonlyDeleteProperty: ProxyHandler<ReactiveRawTarget>['deleteProperty'] = () => {
  if (__DEV__) {
    console.warn(reactivityReadonlyWarning)
  }

  return true
}

/**
 * 深层可变响应式代理的处理器，适配普通对象与数组。
 *
 * @remarks
 * - 与 Vue 3 的 `mutableHandlers` 对齐。
 * - 支持依赖收集、触发、Ref 解包等完整响应式能力。
 */
export const mutableHandlers = {
  get: createGetter(false, false),
  set: mutableSet,
  deleteProperty: mutableDeleteProperty,
  has: mutableHas,
  ownKeys: mutableOwnKeys,
} satisfies ProxyHandler<ReactiveRawTarget>

/**
 * 浅层可变响应式代理的处理器。
 *
 * @remarks
 * - 仅代理顶层属性，嵌套对象保持原样。
 */
export const shallowReactiveHandlers = {
  get: createGetter(false, true),
  set: mutableSet,
  deleteProperty: mutableDeleteProperty,
  has: mutableHas,
  ownKeys: mutableOwnKeys,
} satisfies ProxyHandler<ReactiveRawTarget>

/**
 * 浅层只读代理的处理器。
 *
 * @remarks
 * - 仅顶层属性为只读，嵌套对象保持原样可写。
 */
export const shallowReadonlyHandlers = {
  get: createGetter(true, true),
  set: readonlySet,
  deleteProperty: readonlyDeleteProperty,
  has: mutableHas,
  ownKeys: mutableOwnKeys,
} satisfies ProxyHandler<ReactiveRawTarget>

/**
 * 深层只读代理的处理器。
 *
 * @remarks
 * - 所有层级的属性都为只读，写入操作在开发态会触发警告。
 */
export const readonlyHandlers = {
  get: createGetter(true, false),
  set: readonlySet,
  deleteProperty: readonlyDeleteProperty,
  has: mutableHas,
  ownKeys: mutableOwnKeys,
} satisfies ProxyHandler<ReactiveRawTarget>
