import { ReactiveEffect } from '../effect.ts'
import { trackEffect, triggerEffects } from '../internals/dep-utils.ts'
import type { DependencyBucket } from '../shared/types.ts'
import type { Ref } from './types.ts'
import { refFlag } from './types.ts'

export type ComputedGetter<T> = () => T
export type ComputedSetter<T> = (value: T) => void
export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

const readonlyComputedError =
  '当前 computed 为只读，若需要写入请传入 { get, set } 形式的配置'

class ComputedRefImpl<T> implements Ref<T> {
  readonly dep: DependencyBucket = new Set()

  readonly [refFlag] = true as const

  private readonly effect: ReactiveEffect<T>

  private readonly setter: ComputedSetter<T>

  private innerDirty = true

  private innerValue!: T

  constructor(getter: ComputedGetter<T>, setter: ComputedSetter<T>) {
    this.setter = setter
    /* 依赖变更时通过调度器标记脏值并触发外层依赖。 */
    this.effect = new ReactiveEffect(getter, () => {
      this.markDirty()
    })
  }

  get value(): T {
    trackEffect(this.dep)

    if (this.innerDirty) {
      this.innerDirty = false
      this.innerValue = this.effect.run()
    }

    return this.innerValue
  }

  set value(newValue: T) {
    this.setter(newValue)
  }

  private markDirty(): void {
    if (this.innerDirty) {
      return
    }

    this.innerDirty = true
    triggerEffects(this.dep)
  }
}

function createReadonlySetter<T>(): ComputedSetter<T> {
  return () => {
    throw new TypeError(readonlyComputedError)
  }
}

export function computed<T>(getter: ComputedGetter<T>): Ref<T>
export function computed<T>(options: WritableComputedOptions<T>): Ref<T>

export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
): Ref<T> {
  if (typeof getterOrOptions === 'function') {
    return new ComputedRefImpl(getterOrOptions, createReadonlySetter<T>())
  }

  const { get, set } = getterOrOptions

  return new ComputedRefImpl(get, set)
}
