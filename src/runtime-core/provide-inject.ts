import {  getCurrentInstance } from './component/context.ts'

export type InjectionKey<T = unknown> = PropertyKey & { __miniVueInjectionKey?: T }

export function provide<T>(key: InjectionKey<T>, value: T): void {
  const instance = getCurrentInstance()

  if (!instance) {
    throw new Error('provide: 只能在组件 setup 期间调用')
  }

  ;(instance.provides)[key] = value
}

export function inject<T>(key: InjectionKey<T>): T | undefined
export function inject<T>(key: InjectionKey<T>, defaultValue: T): T

export function inject<T>(key: InjectionKey<T>, defaultValue?: T): T | undefined {
  const instance = getCurrentInstance()

  if (!instance) {
    throw new Error('inject: 只能在组件 setup 期间调用')
  }

  const {provides} = instance

  if (key in provides) {
    return provides[key] as T
  }

  return defaultValue
}
