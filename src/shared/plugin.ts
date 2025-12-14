import type { InjectionKey, InjectionToken } from './injection.ts'

/**
 * 插件安装所需的最小 App 能力契约。
 */
export interface PluginInstallApp {
  /** 可选卸载钩子：存在时插件可在卸载后完成清理。 */
  unmount?: () => void
  /** 应用级依赖注入入口（泛型重载用于推导注入值类型）。 */
  provide<T>(key: InjectionKey<T>, value: T): void
  /** 非泛型 token 入口：用于兼容 string key 等场景。 */
  provide(key: InjectionToken, value: unknown): void
}
