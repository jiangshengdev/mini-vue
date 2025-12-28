/**
 * 插件契约模块。
 *
 * 本模块定义插件安装所需的最小 App 能力契约，
 * 用于约束插件可以访问的应用实例方法。
 */
import type { InjectionKey, InjectionToken } from './injection.ts'

/**
 * 插件安装所需的最小 App 能力契约。
 *
 * 插件通过此接口访问应用实例的有限能力，包括：
 * - `unmount`：可选的卸载钩子，用于插件清理
 * - `provide`：应用级依赖注入入口
 */
export interface PluginInstallApp {
  /** 可选卸载钩子：存在时插件可在卸载后完成清理。 */
  unmount?: () => void
  /** 应用级依赖注入入口（泛型重载用于推导注入值类型）。 */
  provide<T>(key: InjectionKey<T>, value: T): void
  /** 非泛型 token 入口：用于兼容 string key 等场景。 */
  provide(key: InjectionToken, value: unknown): void
}

/** 插件清理回调类型。 */
export type PluginUninstall<App extends PluginInstallApp> = (app: App) => void

/** 支持对象形式的插件定义。 */
export interface PluginObject<App extends PluginInstallApp> {
  /** 插件名：用于去重。 */
  name?: string
  /** 安装钩子，可选返回清理函数。 */
  install?: (app: App) => void
  /** 显式声明的清理函数。 */
  uninstall?: PluginUninstall<App>
}

/** 插件定义：仅支持对象形式。 */
export type PluginDefinition<App extends PluginInstallApp> = PluginObject<App>
