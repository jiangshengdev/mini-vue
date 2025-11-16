import { reactive } from '../reactive.ts'
import { isObject } from '@/shared/utils.ts'
import type { DepTarget, Ref, RefMarker } from './types.ts'
import { REF_FLAG } from './types.ts'
import { collectEffect, dispatchEffects } from '../internals/depUtils.ts'
import type { Dep } from '../shared/types.ts'

/**
 * RefImpl 负责封装普通值的响应式访问器，实现依赖收集与触发。
 */
export class RefImpl<T> implements Ref<T>, DepTarget {
  readonly dep: Dep = new Set()
  readonly [REF_FLAG] = true as const
  private _rawValue: T

  /**
   * 构造函数缓存原始值，并在必要时将其转换为响应式对象。
   */
  constructor(value: T) {
    this._rawValue = value
    this._value = convert(value)
  }

  private _value: T

  /**
   * 访问 Ref 的值时进行依赖收集，并返回最新缓存的副本。
   */
  get value(): T {
    /* 读取时登记当前副作用，保持追踪关系。 */
    collectEffect(this.dep)

    return this._value
  }

  /**
   * 写入 Ref 的值时同步更新原值与响应式副本，并调度依赖副作用。
   */
  set value(newValue: T) {
    /* 使用 Object.is 判等，避免无意义的触发。 */
    if (Object.is(newValue, this._rawValue)) {
      return
    }

    /* 更新原始值与响应式引用后，触发依赖的副作用重新执行。 */
    this._rawValue = newValue
    this._value = convert(newValue)
    dispatchEffects(this.dep)
  }
}

/**
 * ObjectRefImpl 将对象属性包装成 Ref，与原始对象读写保持同步。
 */
export class ObjectRefImpl<
    T extends Record<PropertyKey, unknown>,
    K extends keyof T,
  >
  implements Ref<T[K]>, RefMarker
{
  readonly [REF_FLAG] = true as const
  private readonly target: T
  private readonly key: K

  /**
   * 构造时记录目标对象与属性键，后续读写将直接代理到该属性。
   */
  constructor(target: T, key: K) {
    this.target = target
    this.key = key
  }

  /**
   * 读取属性 Ref 时实时返回对象上的当前值。
   */
  get value(): T[K] {
    /* 不额外缓存值，直接透传原对象，确保和原始 getter 一致。 */
    return this.target[this.key]
  }

  /**
   * 写入属性 Ref 时同步赋值到原对象属性上。
   */
  set value(newValue: T[K]) {
    /* 通过直接赋值驱动外部响应式系统感知变更。 */
    this.target[this.key] = newValue
  }
}

/**
 * convert 根据值类型决定是否递归包裹成响应式对象。
 */
function convert<T>(value: T): T {
  /* 对象类型交由 reactive 处理，其余原样返回。 */
  if (isObject(value)) {
    return reactive(value) as T
  }

  return value
}
