import { getCurrentInstance } from './component/context.ts'

declare const injectionKeyBrand: unique symbol

export type InjectionKey<T = unknown> = symbol & { readonly [injectionKeyBrand]?: T }

export type InjectionToken<T = unknown> = InjectionKey<T> | string

export function provide<T>(key: InjectionToken<T>, value: T): void

export function provide(key: InjectionToken, value: unknown): void {
  const instance = getCurrentInstance()

  if (!instance) {
    throw new Error('provide: 只能在组件 setup 期间调用')
  }

  instance.provides[key] = value
}

export function inject<T>(key: InjectionToken<T>): T | undefined
export function inject<T>(key: InjectionToken<T>, defaultValue: T): T

export function inject<T>(key: InjectionToken<T>, defaultValue?: T): T | undefined {
  const instance = getCurrentInstance()

  if (!instance) {
    throw new Error('inject: 只能在组件 setup 期间调用')
  }

  const { provides } = instance

  if (key in provides) {
    return provides[key] as T
  }

  return defaultValue
}
