import type { Dep } from '../shared/types.ts'

export const REF_FLAG = Symbol('isRef')

export interface Ref<T = unknown> {
  value: T
}

export interface RefMarker {
  readonly [REF_FLAG]: true
}

export interface DepTarget extends RefMarker {
  readonly dep: Dep
}
