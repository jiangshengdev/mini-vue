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

/**
 * 按当前状态执行一次挂载，负责生成子树并调度渲染。
 */
function mountApp<HostElement>(
  state: AppState<HostElement>,
  target: HostElement,
): void {
  /* 已挂载时直接阻止重复操作，避免宿主状态错乱。 */
  if (state.status === 'mounted') {
    throw new Error('createApp: 当前应用已挂载，不能重复执行 mount')
  }

  /* 缓存容器以便后续执行 unmount。 */
  state.container = target

  /* 运行根组件获取最新子树，确保 props 变更生效。 */
  const subtree = state.rootComponent({ ...(state.rootProps ?? {}) })

  /* 交由渲染器负责真正的 DOM 挂载。 */
  state.config.render(subtree, target)
  state.status = 'mounted'
}

/**
 * 清理当前应用实例，释放宿主容器与内部状态。
 */
function unmountApp<HostElement>(state: AppState<HostElement>): void {
  /* 没有容器代表尚未挂载，直接跳过。 */
  if (!state.container) {
    return
  }

  /* 调用宿主清理逻辑并重置状态，便于后续重新挂载。 */
  state.config.clear(state.container)
  state.status = 'idle'
  state.container = null
}

/**
 * 创建应用实例，封装 mount/unmount 生命周期与状态管理。
 */
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

  /* 用户态 mount 会透传容器给核心挂载逻辑。 */
  function mount(target: HostElement): void {
    mountApp(state, target)
  }

  /* unmount 暴露为实例方法，便于控制生命周期。 */
  function unmount(): void {
    unmountApp(state)
  }

  return {
    mount,
    unmount,
  }
}
