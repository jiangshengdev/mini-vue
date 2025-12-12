import { getCurrentInstance } from './component/context.ts'

/**
 * 用于在类型层面把 `InjectionKey<T>` 与 `T` 关联起来的品牌字段。
 *
 * @remarks
 * - 仅参与类型推导；运行期不会产生任何额外字段。
 */
declare const injectionKeyBrand: unique symbol

/**
 * 依赖注入 Key（推荐使用 `symbol`），用于在 `provide`/`inject` 间建立类型安全的关联。
 *
 * @remarks
 * - 该类型仅用于类型推导与约束。
 * - 运行期 key 就是一个 `symbol`，不会自动做任何命名空间隔离。
 */
export type InjectionKey<T = unknown> = symbol & { readonly [injectionKeyBrand]?: T }

/**
 * 依赖注入 Token。
 *
 * @remarks
 * - 组件内注入：`provide(token, value)` / `inject(token)`
 * - 应用级提供：在插件/路由等组件外场景，请使用 `app.provide(token, value)`
 */
export type InjectionToken<T = unknown> = InjectionKey<T> | string

/**
 * 在当前组件实例上提供依赖，供后代组件通过 `inject()` 读取。
 *
 * @remarks
 * - 严格语义：只能在组件 `setup()` 执行期间调用。
 * - 组件外（如 `app.use()` 插件安装、`router.install()`）请改用 `app.provide()`。
 *
 * @throws 当不存在当前组件实例时抛错（通常意味着不在 `setup()` 中调用）。
 */
export function provide<T>(key: InjectionToken<T>, value: T): void

export function provide(key: InjectionToken, value: unknown): void {
  /* 依赖注入容器位于“当前组件实例”上，因此必须处于 setup 执行窗口期。 */
  const instance = getCurrentInstance()

  /* 没有实例通常意味着在组件外调用（例如模块顶层或事件回调中）。 */
  if (!instance) {
    throw new Error('provide: 只能在组件 setup 期间调用')
  }

  /* 通过 provides 写入：后代组件将沿着原型链读取到该值。 */
  instance.provides[key] = value
}

/**
 * 从当前组件的注入上下文中读取依赖。
 *
 * @remarks
 * - 严格语义：只能在组件 `setup()` 执行期间调用。
 * - 若 key 不存在且未传 `defaultValue`，返回 `undefined`。
 * - 若传入 `defaultValue` 且 key 不存在，返回 `defaultValue`。
 *
 * @throws 当不存在当前组件实例时抛错（通常意味着不在 `setup()` 中调用）。
 */
export function inject<T>(key: InjectionToken<T>): T | undefined
export function inject<T>(key: InjectionToken<T>, defaultValue: T): T

export function inject<T>(key: InjectionToken<T>, defaultValue?: T): T | undefined {
  /* 与 provide 一致：注入只能在 setup 阶段发生，避免隐式的全局状态。 */
  const instance = getCurrentInstance()

  /* 不在 setup 期间调用时直接抛错，避免读到不确定的上下文。 */
  if (!instance) {
    throw new Error('inject: 只能在组件 setup 期间调用')
  }

  const { provides } = instance

  /*
   * 使用 `in` 而非 `hasOwnProperty`：
   * - 允许通过原型链继承父组件 / 应用级 provides。
   * - 与 provides 的“层级链”语义保持一致。
   */
  if (key in provides) {
    return provides[key] as T
  }

  return defaultValue
}
