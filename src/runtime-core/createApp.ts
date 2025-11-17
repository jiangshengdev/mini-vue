import type { ComponentType } from '@/jsx/vnode'
import type { RootRenderFunction } from './renderer.ts'

export interface AppRuntimeConfig<HostElement> {
  render: RootRenderFunction<HostElement>
  clear: (container: HostElement) => void
}

export interface AppInstance<HostElement> {
  mount(target: HostElement): void
  unmount(): void
}

interface AppState<HostElement> {
  status: 'idle' | 'mounted'
  container: HostElement | null
  config: AppRuntimeConfig<HostElement>
  rootComponent: ComponentType
  rootProps?: Record<string, unknown>
}

function mountApp<HostElement>(
  state: AppState<HostElement>,
  target: HostElement,
): void {
  if (state.status === 'mounted') {
    throw new Error('createApp: 当前应用已挂载，不能重复执行 mount')
  }

  state.container = target

  const subtree = state.rootComponent({ ...(state.rootProps ?? {}) })

  state.config.render(subtree, target)
  state.status = 'mounted'
}

function unmountApp<HostElement>(state: AppState<HostElement>): void {
  if (!state.container) {
    return
  }

  state.config.clear(state.container)
  state.status = 'idle'
  state.container = null
}

export function createAppInstance<HostElement>(
  config: AppRuntimeConfig<HostElement>,
  rootComponent: ComponentType,
  rootProps?: Record<string, unknown>,
): AppInstance<HostElement> {
  const state: AppState<HostElement> = {
    status: 'idle',
    container: null,
    config,
    rootComponent,
    rootProps,
  }

  function mount(target: HostElement): void {
    mountApp(state, target)
  }

  function unmount(): void {
    unmountApp(state)
  }

  return {
    mount,
    unmount,
  }
}
