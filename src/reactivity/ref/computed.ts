import type { DependencyBucket } from '../contracts/index.ts'
import { refFlag } from '../contracts/index.ts'
import { recordEffectScope } from '../effect-scope.ts'
import { ReactiveEffect } from '../effect.ts'
import { trackEffect, triggerEffects } from '../internals/index.ts'
import type { Ref } from './types.ts'
import { reactivityComputedReadonly } from '@/messages/index.ts'
import {
  __INTERNAL_DEV__,
  createDebugLogger,
  errorContexts,
  errorPhases,
  runThrowing,
} from '@/shared/index.ts'

/**
 * `computed` getter 负责在依赖图中派生出最终结果。
 *
 * @remarks
 * - getter 函数会被 `ReactiveEffect` 包装，执行期间读取的响应式属性会被自动收集为依赖。
 *
 * @public
 */
export type ComputedGetter<T> = () => T

/**
 * `computed` setter 在可写场景下接收外部写入值。
 *
 * @remarks
 * - setter 通常会修改上游依赖，从而间接更新 computed 的值。
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
  /**
   * 读取时返回派生值，并建立依赖关系。
   */
  get: ComputedGetter<T>

  /**
   * 写入时自定义同步方式，可触发外部副作用。
   */
  set: ComputedSetter<T>
}

const debug = __INTERNAL_DEV__ ? createDebugLogger('computed') : null

interface GetterMockLike {
  getMockName?: () => string
}

/**
 * `computed` 的底层实现，通过惰性求值与脏标记保持派生状态最新。
 *
 * @remarks
 * - 内部使用 `ReactiveEffect` 追踪 getter 的依赖。
 * - 依赖变更时通过调度器标记脏值，而非立即重新计算。
 * - 只有在读取 `value` 时才会执行实际计算（惰性求值）。
 */
class ComputedRefImpl<T> implements Ref<T> {
  /** 当前 computed 的依赖集合，用于收集/触发读取 `value` 的外层副作用。 */
  readonly dependencyBucket: DependencyBucket = new Set()

  /** 标记当前对象为 Ref 实例。 */
  readonly [refFlag] = true as const

  /**
   * Vue Devtools 兼容：通过 `__v_isRef` 识别 Ref。
   *
   * @remarks
   * Devtools 会基于该标记对 Ref 做 unref，避免把包含内部字段（如 effect）的 computed 实例直接序列化导致 structured clone 失败。
   */
  // eslint-disable-next-line no-useless-computed-key
  get ['__v_isRef'](): true {
    return true
  }

  /**
   * 内部 effect，用于追踪 getter 的依赖并在依赖变更时标记脏值。
   */
  private readonly effect: ReactiveEffect<T>

  /**
   * 开发态用于调试输出的 getter 名称。
   */
  private readonly effectName?: string

  /**
   * 用户提供的 setter，用于可写 computed 场景。
   */
  private readonly setter: ComputedSetter<T>

  /**
   * 标记当前缓存是否过期，`true` 时需要重新执行 getter。
   */
  private needsRecompute = true

  /**
   * 缓存最近一次执行 getter 的结果，供下次同步返回。
   */
  private cachedValue!: T

  /**
   * 构造函数：将 getter 封装为 ReactiveEffect，并注入专用调度器以刷新脏标记。
   *
   * @param getter - 计算属性的 getter 函数
   * @param setter - 计算属性的 setter 函数（只读 computed 会传入抛出异常的 setter）
   */
  constructor(getter: ComputedGetter<T>, setter: ComputedSetter<T>) {
    this.setter = setter

    if (__INTERNAL_DEV__ && debug) {
      const getterMock = getter as ComputedGetter<T> & GetterMockLike

      this.effectName = getterMock.getMockName ? getterMock.getMockName() : getter.name
    }

    /* 依赖变更时通过调度器标记脏值并触发外层依赖。 */
    this.effect = new ReactiveEffect(getter, () => {
      this.markDirty()
    })

    recordEffectScope(this.effect)
  }

  /**
   * 读取 computed 值时，先追踪依赖，再在需要时执行惰性求值。
   *
   * @returns 计算后的值
   *
   * @remarks
   * - 外层 effect 访问 computed 时会记录依赖，便于后续触发。
   * - 首次访问或依赖脏时重新运行 getter，并缓存结果。
   */
  get value(): T {
    /* 外层 effect 访问 computed 时记录依赖，便于后续触发。 */
    trackEffect(this.dependencyBucket, { source: 'computed.value' })

    /* 首次访问或依赖脏时重新运行 getter，并缓存结果。 */
    if (this.needsRecompute) {
      if (__INTERNAL_DEV__ && debug) {
        debug('get value', '重新计算派生值', {
          cachedValue: this.cachedValue,
          effectName: this.effectName,
          needsRecompute: this.needsRecompute,
        })
      }

      const value = this.effect.run()

      this.cachedValue = value
      this.needsRecompute = false

      if (__INTERNAL_DEV__ && debug) {
        debug('get value', '派生值已更新', {
          cachedValue: this.cachedValue,
          effectName: this.effectName,
          needsRecompute: this.needsRecompute,
        })
      }
    }

    return this.cachedValue
  }

  /**
   * 写入 computed 值时交给自定义 setter，由实现自行决定同步策略。
   *
   * @param newValue - 新值
   *
   * @remarks
   * - 只读 computed 的 setter 会抛出 TypeError。
   * - 可写 computed 的 setter 由用户提供，通常会修改上游依赖。
   */
  set value(newValue: T) {
    if (__INTERNAL_DEV__ && debug) {
      debug('set value', '收到写入请求', { value: newValue })
    }

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
   *
   * @remarks
   * - 已经是脏状态时无需重复触发，避免额外调度。
   * - 该方法由内部 effect 的调度器调用。
   */
  private markDirty(): void {
    /* 已经是脏状态时无需重复触发，避免额外调度。 */
    if (this.needsRecompute) {
      return
    }

    this.needsRecompute = true

    if (__INTERNAL_DEV__ && debug) {
      debug('markDirty', '标记为脏值，准备触发依赖', {
        dependencySize: this.dependencyBucket.size,
        effectName: this.effectName,
        needsRecompute: this.needsRecompute,
      })
    }

    triggerEffects(this.dependencyBucket)
  }
}

/**
 * 生成只读 computed 的 setter，在运行时抛出明确的类型错误。
 *
 * @returns 抛出 TypeError 的 setter 函数
 */
function createReadonlySetter<T>(): ComputedSetter<T> {
  return (newValue) => {
    throw new TypeError(reactivityComputedReadonly, { cause: newValue })
  }
}

/**
 * 对外暴露的 computed API，根据传参类型决定只读或可写实现。
 *
 * 生命周期说明：
 *
 * - computed 内部会创建一个 `ReactiveEffect` 执行 getter，并在构造时通过 `recordEffectScope()` 登记到当前活跃的 `effectScope`。
 * - 因此在 `scope.run(() => { ... })` 期间创建的 computed，会在 `scope.stop()` 时被统一 stop，自动断开与上游依赖的关联。
 * - 与 Vue 3 公共 API 一致：computed 返回 `Ref<T>` 语义，不提供公开的 `stop()` 方法；需要手动管理生命周期时，请使用 `effectScope()` 托管。
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
