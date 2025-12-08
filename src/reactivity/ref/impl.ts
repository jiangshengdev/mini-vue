import { reactive } from '../reactive.ts'
import { trackEffect, triggerEffects } from '../internals/index.ts'
import type { DependencyBucket } from '../shared/index.ts'
import type { Ref } from './types.ts'
import type { PlainObject } from '@/shared/index.ts'
import { isPlainObject } from '@/shared/index.ts'
import { refFlag } from '../shared/index.ts'

/**
 * RefImpl 负责封装普通值的响应式访问器，实现依赖收集与触发。
 */
export class RefImpl<T> implements Ref<T> {
  readonly dependencyBucket: DependencyBucket = new Set()

  readonly [refFlag] = true as const

  private rawValue: T

  private innerValue: T

  /**
   * 构造函数缓存原始值，并在必要时将其转换为响应式对象。
   */
  constructor(value: T) {
    this.rawValue = value
    this.innerValue = maybeReactiveValue(value)
  }

  /**
   * 访问 Ref 的值时进行依赖收集，并返回最新缓存的副本。
   */
  get value(): T {
    /* 读取时登记当前副作用，保持追踪关系。 */
    trackEffect(this.dependencyBucket)

    return this.innerValue
  }

  /**
   * 写入 Ref 的值时同步更新原值与响应式副本，并调度依赖副作用。
   */
  set value(newValue: T) {
    /* 使用 Object.is 判等，避免无意义的触发。 */
    if (Object.is(newValue, this.rawValue)) {
      return
    }

    /* 更新原始值与响应式引用后，触发依赖的副作用重新执行。 */
    this.rawValue = newValue
    this.innerValue = maybeReactiveValue(newValue)
    triggerEffects(this.dependencyBucket)
  }
}

/**
 * ObjectRefImpl 将对象属性包装成 Ref，与原始对象读写保持同步。
 */
export class ObjectRefImpl<T extends PlainObject, K extends keyof T> implements Ref<T[K]> {
  readonly [refFlag] = true as const

  private readonly target: T

  private readonly key: K

  private readonly dependencyBucket?: DependencyBucket

  /**
   * 构造时记录目标对象与属性键，后续读写将直接代理到该属性。
   */
  constructor(target: T, key: K, needsLocalDep = false) {
    this.target = target
    this.key = key

    if (needsLocalDep) {
      this.dependencyBucket = new Set()
    }
  }

  /**
   * 读取属性 Ref 时实时返回对象上的当前值。
   */
  get value(): T[K] {
    const value = this.target[this.key]

    if (this.dependencyBucket) {
      /* 普通对象属性通过自身 dependencyBucket 追踪依赖。 */
      trackEffect(this.dependencyBucket)
    }

    /* 不额外缓存值，直接透传原对象，确保和原始 getter 一致。 */
    return value
  }

  /**
   * 写入属性 Ref 时同步赋值到原对象属性上。
   */
  set value(newValue: T[K]) {
    if (this.dependencyBucket) {
      const previousValue = this.target[this.key]

      if (Object.is(previousValue, newValue)) {
        return
      }

      this.target[this.key] = newValue

      /* 普通对象属性依赖由自身 dependencyBucket 驱动。 */
      triggerEffects(this.dependencyBucket)

      return
    }

    /* 通过直接赋值驱动外部响应式系统感知变更。 */
    this.target[this.key] = newValue
  }
}

/**
 * `maybeReactiveValue` 根据值类型决定是否递归包裹成响应式对象。
 */
function maybeReactiveValue<T>(value: T): T {
  /* 仅针对普通对象或数组递归创建响应式代理，其他对象原样返回。 */
  if (Array.isArray(value)) {
    return reactive(value) as T
  }

  if (isPlainObject(value)) {
    return reactive(value as PlainObject) as T
  }

  return value
}
