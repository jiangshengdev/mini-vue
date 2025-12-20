import { getCurrentInstance } from './component/context.ts'
import { runtimeCoreInjectOutsideSetup, runtimeCoreProvideOutsideSetup } from '@/messages/index.ts'
import type { InjectionToken } from '@/shared/index.ts'

/**
 * 在当前组件实例上提供依赖，供后代组件通过 `inject()` 读取。
 *
 * @public
 *
 * @remarks
 * - 严格语义：只能在组件 `setup()` 执行期间调用。
 * - 组件外（如 `app.use()` 插件安装、`router.install()`）请改用 `app.provide()`。
 *
 * @throws 当不存在当前组件实例时抛错（通常意味着不在 `setup()` 中调用）。
 */
export function provide<T>(key: InjectionToken<T>, value: T): void

export function provide(key: InjectionToken, value: unknown): void {
  /* 依赖注入容器位于「当前组件实例」上，因此必须处于 setup 执行窗口期。 */
  const instance = getCurrentInstance()

  /* 没有实例通常意味着在组件外调用（例如模块顶层或事件回调中）。 */
  if (!instance) {
    throw new Error(runtimeCoreProvideOutsideSetup)
  }

  /* 通过 provides 写入：后代组件将沿着原型链读取到该值。 */
  instance.provides[key] = value
}

/**
 * 从当前组件的注入上下文中读取依赖。
 *
 * @public
 *
 * @remarks
 * - 严格语义：只能在组件 `setup()` 执行期间调用。
 * - 若 key 不存在且未传 `defaultValue`，返回 `undefined`。
 * - 若传入 `defaultValue` 且 key 不存在，返回 `defaultValue`。
 *
 * @throws 当不存在当前组件实例时抛错（通常意味着不在 `setup()` 中调用）。
 */
export function inject<T>(key: InjectionToken<T>): T | undefined
/**
 * @public
 */
export function inject<T>(key: InjectionToken<T>, defaultValue: T): T

export function inject<T>(key: InjectionToken<T>, defaultValue?: T): T | undefined {
  /* 与 provide 一致：注入只能在 setup 阶段发生，避免隐式的全局状态。 */
  const instance = getCurrentInstance()

  /* 不在 setup 期间调用时直接抛错，避免读到不确定的上下文。 */
  if (!instance) {
    throw new Error(runtimeCoreInjectOutsideSetup)
  }

  const { provides } = instance

  /*
   * 使用 `in` 而非 `hasOwnProperty`：
   * - 允许通过原型链继承父组件 / 应用级 provides。
   * - 与 provides 的「层级链」语义保持一致。
   */
  if (key in provides) {
    return provides[key] as T
  }

  return defaultValue
}
