import type { DependencyBucket } from '../contracts/index.ts'
import { refFlag } from '../contracts/index.ts'
import { trackEffect, triggerEffects } from '../internals/index.ts'
import { withoutTracking } from '../internals/tracking.ts'
import { reactive } from '../reactive.ts'
import { toRaw } from '../to-raw.ts'
import type { Ref } from './types.ts'
import type { PlainObject } from '@/shared/index.ts'
import { isPlainObject } from '@/shared/index.ts'

/**
 * `RefImpl` 负责封装普通值的响应式访问器，实现依赖收集与触发。
 *
 * @remarks
 * - 通过 `value` 属性的 getter/setter 实现响应式。
 * - 若值为对象或数组，会被转换为 reactive 代理。
 * - 使用 `Object.is` 判等，避免无意义的触发。
 */
export class RefImpl<T> implements Ref<T> {
  /**
   * 当前 Ref 的依赖集合，用于收集/触发读取 `value` 的副作用。
   */
  readonly dependencyBucket: DependencyBucket = new Set()

  /**
   * 通过 `refFlag` 标记当前对象为 Ref 实例，供 `isRef()` 类型守卫识别。
   */
  readonly [refFlag] = true as const

  /**
   * 最近一次写入的原始值（已 `toRaw`），用于 `Object.is` 判等与避免重复触发。
   */
  private rawValue: T

  /**
   * 供外部读取的内部值：若为对象/数组则会被转换为 reactive 代理。
   */
  private innerValue: T

  /**
   * 构造函数：缓存原始值，并在必要时将其转换为响应式对象。
   *
   * @param value - 初始值
   */
  constructor(value: T) {
    const rawValue = toRaw(value)

    this.rawValue = rawValue
    this.innerValue = maybeReactiveValue(rawValue)
  }

  /**
   * 访问 Ref 的值时进行依赖收集，并返回最新缓存的副本。
   *
   * @returns 当前响应式值
   */
  get value(): T {
    /* 读取时登记当前副作用，保持追踪关系。 */
    trackEffect(this.dependencyBucket, {
      source: 'ref.value',
      rawValue: this.rawValue,
      innerValue: this.innerValue,
    })

    return this.innerValue
  }

  /**
   * 写入 Ref 的值时同步更新原值与响应式副本，并调度依赖副作用。
   *
   * @param newValue - 新值
   *
   * @remarks
   * - 使用 `Object.is` 判等，相同值不会触发依赖。
   * - 若新值为对象或数组，会被转换为 reactive 代理。
   */
  set value(newValue: T) {
    const rawValue = toRaw(newValue)

    /* 使用 Object.is 判等，避免无意义的触发。 */
    if (Object.is(rawValue, this.rawValue)) {
      return
    }

    /* 更新原始值与响应式引用后，触发依赖的副作用重新执行。 */
    this.rawValue = rawValue
    this.innerValue = maybeReactiveValue(rawValue)
    triggerEffects(this.dependencyBucket)
  }
}

/**
 * `ObjectRefImpl` 将对象属性包装成 Ref，与原始对象读写保持同步。
 *
 * @remarks
 * - 读写会直接代理到目标对象的属性上。
 * - 若目标对象是 reactive 代理，会复用其依赖收集机制。
 * - 若目标对象是普通对象，会创建本地依赖集合以支持响应式。
 */
export class ObjectRefImpl<T extends PlainObject, K extends keyof T> implements Ref<T[K]> {
  /** 标记当前对象为 Ref 实例。 */
  readonly [refFlag] = true as const

  /**
   * 被代理的目标对象，读写会直接落到 `target[key]`。
   */
  private readonly target: T

  /**
   * 被代理的属性键，用于定位目标字段。
   */
  private readonly key: K

  /**
   * 非响应式对象场景下的本地依赖集合，用于驱动 `value` 的手动触发。
   *
   * @remarks
   * - 若目标对象是 reactive 代理，该字段为 `undefined`，复用 reactive 的依赖收集。
   */
  private readonly dependencyBucket?: DependencyBucket

  /**
   * 构造函数：记录目标对象与属性键，后续读写将直接代理到该属性。
   *
   * @param target - 目标对象
   * @param key - 属性键
   * @param needsLocalDep - 是否需要本地依赖集合（非 reactive 对象时为 true）
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
   *
   * @returns 目标属性的当前值
   *
   * @remarks
   * - 若目标对象是 reactive 代理，依赖收集由 reactive 处理。
   * - 若目标对象是普通对象，通过本地 `dependencyBucket` 追踪依赖。
   */
  get value(): T[K] {
    const value = this.target[this.key]

    if (this.dependencyBucket) {
      /* 普通对象属性通过自身 `dependencyBucket` 追踪依赖。 */
      trackEffect(this.dependencyBucket, {
        source: 'object-ref',
        target: this.target,
        key: this.key,
      })
    }

    /* 不额外缓存值，直接透传原对象，确保和原始 `getter` 一致。 */
    return value
  }

  /**
   * 写入属性 Ref 时同步赋值到原对象属性上。
   *
   * @param newValue - 新值
   *
   * @remarks
   * - 若目标对象是 reactive 代理，触发由 reactive 处理。
   * - 若目标对象是普通对象，通过本地 `dependencyBucket` 触发依赖。
   * - 使用 `Object.is` 判等，相同值不会触发依赖。
   */
  set value(newValue: T[K]) {
    if (this.dependencyBucket) {
      /*
       * 判等需要读取旧值，但旧值读取可能触发 getter。
       *
       * @remarks
       * - 该读取发生在「写入流程」内部，不应把 getter 中的 reactive 读取收集为依赖。
       * - 因此这里显式禁用依赖收集，避免出现「写入阶段意外收集」。
       */
      const previousValue = withoutTracking(() => {
        return this.target[this.key]
      })

      if (Object.is(previousValue, newValue)) {
        return
      }

      this.target[this.key] = newValue

      /* 普通对象属性依赖由自身 `dependencyBucket` 驱动。 */
      triggerEffects(this.dependencyBucket)

      return
    }

    /* 通过直接赋值驱动外部响应式系统感知变更。 */
    this.target[this.key] = newValue
  }
}

/**
 * 根据值类型决定是否递归包裹成响应式对象。
 *
 * @param value - 要处理的值
 * @returns 若为对象/数组则返回 reactive 代理，否则返回原值
 *
 * @remarks
 * - 仅针对普通对象或数组递归创建响应式代理。
 * - 其他对象（如 Date、RegExp 等）原样返回。
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
