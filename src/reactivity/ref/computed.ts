import { ReactiveEffect } from '../effect.ts'
import { recordEffectScope } from '../effect-scope.ts'
import { trackEffect, triggerEffects } from '../internals/index.ts'
import type { DependencyBucket } from '../contracts/index.ts'
import { refFlag } from '../contracts/index.ts'
import type { Ref } from './types.ts'
import { createDebugLogger, errorContexts, errorPhases, runThrowing } from '@/shared/index.ts'

/**
 * `computed` getter 负责在依赖图中派生出最终结果。
 *
 * @public
 */
export type ComputedGetter<T> = () => T

/**
 * `computed` setter 在可写场景下接收外部写入值。
 *
 * @public
 */
export type ComputedSetter<T> = (value: T) => void

/**
 * 可写 computed 的配置项，显式声明读取与写入逻辑。
 *
 * @public
 */
export interface WritableComputedOptions<T> {
  /** 读取时返回派生值，并建立依赖关系。 */
  get: ComputedGetter<T>
  /** 写入时自定义同步方式，可触发外部副作用。 */
  set: ComputedSetter<T>
}

/** 用于提示只读 computed 被误写入的错误信息。 */
const readonlyComputedError = '当前 computed 为只读，若需要写入请传入 { get, set } 形式的配置'

const debug = createDebugLogger('computed')

/**
 * `computed` 的底层实现，通过惰性求值与脏标记保持派生状态最新。
 */
class ComputedRefImpl<T> implements Ref<T> {
  readonly dependencyBucket: DependencyBucket = new Set()

  readonly [refFlag] = true as const

  private readonly effect: ReactiveEffect<T>

  private readonly effectName: string

  private readonly setter: ComputedSetter<T>

  /** 标记当前缓存是否过期，true 时需要重新执行 getter。 */
  private needsRecompute = true

  /** 缓存最近一次执行 getter 的结果，供下次同步返回。 */
  private cachedValue!: T

  /**
   * 将 getter 封装为 ReactiveEffect，并注入专用调度器以刷新脏标记。
   */
  constructor(getter: ComputedGetter<T>, setter: ComputedSetter<T>) {
    this.setter = setter
    this.effectName = getter.name
    /* 依赖变更时通过调度器标记脏值并触发外层依赖。 */
    this.effect = new ReactiveEffect(getter, () => {
      this.markDirty()
    })

    recordEffectScope(this.effect)
  }

  /**
   * 读取 computed 值时，先追踪依赖，再在需要时执行惰性求值。
   */
  get value(): T {
    /* 外层 effect 访问 computed 时记录依赖，便于后续触发。 */
    trackEffect(this.dependencyBucket, { source: 'computed.value' })

    /* 首次访问或依赖脏时重新运行 getter，并缓存结果。 */
    if (this.needsRecompute) {
      debug('get value', '重新计算派生值', {
        cachedValue: this.cachedValue,
        effectName: this.effectName,
        needsRecompute: this.needsRecompute,
      })
      this.needsRecompute = false
      this.cachedValue = this.effect.run()
      debug('get value', '派生值已更新', {
        cachedValue: this.cachedValue,
        effectName: this.effectName,
        needsRecompute: this.needsRecompute,
      })
    }

    return this.cachedValue
  }

  /**
   * 写入 computed 值时交给自定义 setter，由实现自行决定同步策略。
   */
  set value(newValue: T) {
    debug('set value', '收到写入请求', { value: newValue })
    runThrowing(
      () => {
        this.setter(newValue)
      },
      {
        origin: errorContexts.computedSetter,
        handlerPhase: errorPhases.sync,
      },
    )
  }

  /**
   * 将当前 computed 标记为脏，并唤起依赖它的 effect 重新计算。
   */
  private markDirty(): void {
    /* 已经是脏状态时无需重复触发，避免额外调度。 */
    if (this.needsRecompute) {
      return
    }

    this.needsRecompute = true
    debug('markDirty', '标记为脏值，准备触发依赖', {
      dependencySize: this.dependencyBucket.size,
      effectName: this.effectName,
      needsRecompute: this.needsRecompute,
    })
    triggerEffects(this.dependencyBucket)
  }
}

/**
 * 生成只读 computed 的 setter，在运行时抛出明确的类型错误。
 */
function createReadonlySetter<T>(): ComputedSetter<T> {
  return (newValue) => {
    throw new TypeError(readonlyComputedError, { cause: newValue })
  }
}

/**
 * 对外暴露的 computed API，根据传参类型决定只读或可写实现。
 *
 * @public
 */
export function computed<T>(getter: ComputedGetter<T>): Ref<T>
/**
 * @public
 */
export function computed<T>(options: WritableComputedOptions<T>): Ref<T>

export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
): Ref<T> {
  /* 直接传函数时创建只读 computed，避免误写。 */
  if (typeof getterOrOptions === 'function') {
    return new ComputedRefImpl(getterOrOptions, createReadonlySetter<T>())
  }

  const { get, set } = getterOrOptions

  /* 结构出自定义 getter/setter，以构造具备写入能力的 computed。 */
  return new ComputedRefImpl(get, set)
}
