import type { PluginDefinition, PluginInstallApp } from '@/shared/index.ts'
import { __DEV__ } from '@/shared/index.ts'
import { miniVueDevtoolsPluginName } from './constants.ts'
import { createMiniVueDevtoolsAppInitPayload } from './app-shim.ts'
import { getVueDevtoolsGlobalHook, emitVueDevtoolsAppInit, emitVueDevtoolsAppUnmount } from './hook.ts'
import { registerMiniVueDevtoolsTab } from './tab.ts'

interface PatchedMountState {
  originalMount: (target: unknown) => unknown
  devtoolsApp?: unknown
}

const patchedStateByApp = new WeakMap<object, PatchedMountState>()

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function tryConnectVueDevtools(appState: PatchedMountState, mountTarget: unknown): void {
  const hook = getVueDevtoolsGlobalHook()

  if (!hook) {
    return
  }

  if (!appState.devtoolsApp) {
    const payload = createMiniVueDevtoolsAppInitPayload({ mountTarget })

    appState.devtoolsApp = payload.app

    emitVueDevtoolsAppInit({
      hook,
      app: payload.app,
      version: payload.version,
      types: payload.types,
    })
  }

  registerMiniVueDevtoolsTab()
}

export const MiniVueDevtoolsPlugin: PluginDefinition<PluginInstallApp> = {
  name: miniVueDevtoolsPluginName,
  install(app) {
    if (!__DEV__) {
      return
    }

    if (!isObject(app)) {
      return
    }

    const appWithMount = app as PluginInstallApp & {
      mount?: (target: unknown) => unknown
    }

    const mount = appWithMount.mount

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
    if (!isObject(app)) {
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

