import { reactive } from '../reactive.ts'
import { isObject } from '@/shared/utils.ts'
import type { DepTarget, Ref, RefMarker } from './types.ts'
import { REF_FLAG } from './types.ts'
import { collectEffect, dispatchEffects } from '../internals/depUtils.ts'
import type { Dep } from '../shared/types.ts'

export class RefImpl<T> implements Ref<T>, DepTarget {
  readonly dep: Dep = new Set()
  readonly [REF_FLAG] = true as const
  private _rawValue: T

  constructor(value: T) {
    this._rawValue = value
    this._value = convert(value)
  }

  private _value: T

  get value(): T {
    collectEffect(this.dep)

    return this._value
  }

  set value(newValue: T) {
    if (Object.is(newValue, this._rawValue)) {
      return
    }

    this._rawValue = newValue
    this._value = convert(newValue)
    dispatchEffects(this.dep)
  }
}

export class ObjectRefImpl<
    T extends Record<PropertyKey, unknown>,
    K extends keyof T,
  >
  implements Ref<T[K]>, RefMarker
{
  readonly [REF_FLAG] = true as const
  private readonly target: T
  private readonly key: K

  constructor(target: T, key: K) {
    this.target = target
    this.key = key
  }

  get value(): T[K] {
    return this.target[this.key]
  }

  set value(newValue: T[K]) {
    this.target[this.key] = newValue
  }
}

function convert<T>(value: T): T {
  if (isObject(value)) {
    return reactive(value) as T
  }

  return value
}
