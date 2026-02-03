import { piniaInjectionKey } from './injection.ts'
import type { Pinia } from './types.ts'
import type { PluginInstallApp } from '@/shared/index.ts'

/**
 * 创建 pinia 实例（最小实现）。
 *
 * @public
 *
 * @remarks
 * - 仅提供插件安装与 store registry。
 * - 不引入全局 activePinia：只允许在组件 setup 期通过 `inject` 使用。
 */
export function createPinia(): Pinia {
  const installedApps = new Set<PluginInstallApp>()
  const stores = new Map<string, unknown>()

  const pinia: Pinia = {
    name: 'pinia',
    _stores: stores,
    install(app) {
      /* 记录安装关系，用于卸载时做最小清理。 */
      installedApps.add(app)

      /* 通过 app.provide 注入到组件树，供 setup 期间的 useStore 读取。 */
      app.provide(piniaInjectionKey, pinia)
    },
    uninstall(app) {
      installedApps.delete(app)

      /*
       * 所有 app 都卸载后清空 registry，避免长时间占用内存。
       * 该行为不影响外部引用：仍持有 store 的代码将继续可用，但不再被 pinia 管理。
       */
      if (installedApps.size === 0) {
        stores.clear()
      }
    },
  }

  return pinia
}
