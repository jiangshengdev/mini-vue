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
 * @public
 *
 * @remarks
 * - 该类型仅用于类型推导与约束。
 * - 运行期 key 就是一个 `symbol`，不会自动做任何命名空间隔离。
 */
export type InjectionKey<T = unknown> = symbol & { readonly [injectionKeyBrand]?: T }

/**
 * 依赖注入 Token。
 *
 * @beta
 *
 * @remarks
 * - 组件内注入：`provide(token, value)` / `inject(token)`
 * - 应用级提供：在插件/路由等组件外场景，请使用 `app.provide(token, value)`
 */
export type InjectionToken<T = unknown> = InjectionKey<T> | string
