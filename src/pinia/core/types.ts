import type { PluginInstallApp, PluginObject } from '@/shared/index.ts'

/**
 * Pinia 实例类型（最小实现）。
 *
 * @remarks
 * - 作为应用插件被 `app.use()` 安装。
 * - 通过 `app.provide()` 注入到组件树，供 `defineStore` 在 setup 期间 `inject()` 读取。
 */
export interface Pinia extends PluginObject<PluginInstallApp> {
  /**
   * Store 实例表：同一 pinia 内按 id 复用单例。
   *
   * @internal
   */
  _stores: Map<string, unknown>
}

/** Store 的最小形状：仅要求是对象字典。 */
export type StoreTree = Record<string, unknown>

/** Setup store：仅支持现代形式 `defineStore(id, () => ({ ... }))`。 */
export type StoreSetup<Store extends StoreTree> = () => Store

/** Store 实例：在返回对象上补充只读元信息。 */
export type StoreInstance<Id extends string, Store extends StoreTree> = Store & {
  readonly $id: Id
  readonly $pinia: Pinia
}
