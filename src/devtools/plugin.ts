import { createMiniVueDevtoolsAppInitPayload } from './app-shim.ts'
import { miniVueDevtoolsPluginName } from './constants.ts'
import {
  emitVueDevtoolsAppInit,
  emitVueDevtoolsAppUnmount,
  getVueDevtoolsGlobalHook,
} from './hook.ts'
import { registerMiniVueDevtoolsInspector } from './inspector.ts'
import { registerMiniVueDevtoolsTab } from './tab.ts'
import { __DEV__ } from '@/shared/index.ts'
import type { PluginDefinition, PluginInstallApp } from '@/shared/index.ts'

interface PatchedMountState {
  originalMount: (target: unknown) => unknown
  devtoolsApp?: unknown
}

const patchedStateByApp = new WeakMap<WeakKey, PatchedMountState>()

function isWeakKey(value: unknown): value is WeakKey {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function tryConnectVueDevtools(appState: PatchedMountState, mountTarget: unknown): void {
  const hook = getVueDevtoolsGlobalHook()

  if (!hook) {
    return
  }

  /*
   * Vue Devtools（Chrome 扩展）在 detector 中使用 `window.__VUE__` 判断是否“检测到 Vue”。
   * mini-vue 没有该标记，这里仅在 Devtools hook 存在时补一个最小占位，避免 popup 显示 “Vue.js not detected”。
   *
   * 注意：该标记仅用于 Devtools 检测，不参与 mini-vue 运行时语义。
   */
  const globalObject = globalThis as { __VUE__?: unknown }

  globalObject.__VUE__ ??= true

  if (!appState.devtoolsApp) {
    const payload = createMiniVueDevtoolsAppInitPayload({ mountTarget })

    appState.devtoolsApp = payload.app

    emitVueDevtoolsAppInit({
      hook,
      app: payload.app,
      version: payload.version,
      types: payload.types,
    })

    registerMiniVueDevtoolsInspector({ hook, app: payload.app })
  }

  registerMiniVueDevtoolsTab()
}

const miniVueDevtoolsPlugin: PluginDefinition<PluginInstallApp> = {
  name: miniVueDevtoolsPluginName,
  install(app) {
    if (!__DEV__) {
      return
    }

    if (!isWeakKey(app)) {
      return
    }

    const appWithMount = app as PluginInstallApp & {
      mount?: (target: unknown) => unknown
    }

    const { mount } = appWithMount

    if (typeof mount !== 'function') {
      return
    }

    if (patchedStateByApp.has(appWithMount)) {
      return
    }

    const appState: PatchedMountState = {
      originalMount: mount,
      devtoolsApp: undefined,
    }

    patchedStateByApp.set(appWithMount, appState)

    appWithMount.mount = (target: unknown) => {
      const result = appState.originalMount.call(appWithMount, target)

      tryConnectVueDevtools(appState, target)

      return result
    }
  },
  uninstall(app) {
    if (!isWeakKey(app)) {
      return
    }

    const state = patchedStateByApp.get(app)

    if (state) {
      const appWithMount = app as PluginInstallApp & {
        mount?: (target: unknown) => unknown
      }

      appWithMount.mount = state.originalMount

      if (__DEV__ && state.devtoolsApp) {
        const hook = getVueDevtoolsGlobalHook()

        if (hook) {
          emitVueDevtoolsAppUnmount({ hook, app: state.devtoolsApp })
        }
      }

      patchedStateByApp.delete(app)
    }
  },
}

export { miniVueDevtoolsPlugin as MiniVueDevtoolsPlugin }
