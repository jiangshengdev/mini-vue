import { miniVueDevtoolsAppVersion } from './constants.ts'
import { Comment, Fragment, Text } from '@/jsx-foundation/index.ts'
import type { PluginInstallApp } from '@/shared/index.ts'

export interface MiniVueDevtoolsAppInitPayload {
  app: MiniVueDevtoolsApp
  version: string
  types: Record<string, unknown>
}

export interface MiniVueDevtoolsApp extends PluginInstallApp {
  /**
   * Vue Devtools 兼容字段（仅用于 Devtools 读取）。
   *
   * @remarks
   * - Devtools 会在 `app:init` 时读取 `_instance/_component/_container` 等字段构建 app record。
   * - 该字段不参与 mini-vue 运行时语义，仅用于避免 Devtools 后端读取时报错。
   */
  _instance: unknown
  /** Vue Devtools 兼容字段（仅用于 Devtools 读取）。 */
  _container?: Element
  /** Vue Devtools 兼容字段（仅用于 Devtools 读取）。 */
  _component?: unknown
  /** Vue Devtools 兼容字段（仅用于 Devtools 读取）。 */
  config: { globalProperties: Record<string, unknown> }
}

function resolveDomContainer(target: unknown): Element | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }

  if (typeof target === 'string') {
    return document.querySelector(target) ?? undefined
  }

  return target instanceof Element ? target : undefined
}

export function createMiniVueDevtoolsAppInitPayload(options: {
  app: PluginInstallApp
  mountTarget: unknown
}): MiniVueDevtoolsAppInitPayload | undefined {
  const container = resolveDomContainer(options.mountTarget)

  if (!container) {
    return undefined
  }

  const containerWithVnode = container as unknown as { _vnode?: unknown }
  const rootVnode = containerWithVnode._vnode as { component?: unknown; type?: unknown } | undefined
  const rootInstance = rootVnode?.component

  if (!rootInstance) {
    return undefined
  }

  const app = options.app as unknown as MiniVueDevtoolsApp

  ;(app as unknown as { _container?: Element })._container = container
  ;(app as unknown as { _instance?: unknown })._instance = rootInstance
  ;(app as unknown as { _component?: unknown })._component = rootVnode?.type

  const appWithConfig = app as unknown as {
    config?: { globalProperties?: Record<string, unknown> }
  }

  appWithConfig.config ??= { globalProperties: {} }
  appWithConfig.config.globalProperties ??= {}

  const { appContext } = rootInstance as { appContext?: unknown }

  if (appContext && typeof appContext === 'object') {
    const appContextShim = appContext as Record<string, unknown>

    /*
     * 以下字段仅用于 Devtools 读取：
     * - `appContext.app`：用于从组件实例反查 appRecord。
     * - `appContext.mixins`：用于 merged options 计算（避免读取 `mixins.length` 崩溃）。
     */
    appContextShim.app = app
    appContextShim.components ??= {}
    appContextShim.mixins ??= []
  }

  const fragmentTypeKey = 'Fragment'
  const textTypeKey = 'Text'
  const commentTypeKey = 'Comment'

  const types: Record<string, unknown> = {
    [fragmentTypeKey]: Fragment,
    [textTypeKey]: Text,
    [commentTypeKey]: Comment,
  }

  return {
    app,
    version: miniVueDevtoolsAppVersion,
    types,
  }
}
