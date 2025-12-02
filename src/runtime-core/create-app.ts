import type { RootRenderFunction } from './renderer.ts'
import type { ElementProps, SetupFunctionComponent } from '@/jsx/index.ts'
import { createVirtualNode } from '@/jsx/index.ts'

/**
 * 宿主平台注入的渲染配置，提供渲染与清理能力。
 */
export interface AppRuntimeConfig<HostElement> {
  /** 将根子树挂载到目标容器的渲染函数。 */
  render: RootRenderFunction<HostElement>
  /** 卸载宿主容器中的子树，释放响应式副作用。 */
  unmount: (container: HostElement) => void
}

/**
 * `createApp` 返回的实例 API，封装 `mount`/`unmount` 生命周期。
 */
export interface AppInstance<HostElement> {
  /** 指定宿主容器并触发首次渲染。 */
  mount(target: HostElement): void
  /** 停止渲染并释放容器内容。 */
  unmount(): void
}

/**
 * 应用内部状态记录，追踪当前容器与根组件信息。
 */
interface AppState<HostElement> {
  /** 标识应用当前是否已挂载。 */
  status: 'idle' | 'mounted'
  /** 最近一次挂载的宿主容器引用。 */
  container: HostElement | undefined
  /** 宿主注入的渲染配置。 */
  config: AppRuntimeConfig<HostElement>
  /** 根组件定义，用于生成顶层子树。 */
  rootComponent: SetupFunctionComponent
  /** 传入根组件的初始 props。 */
  initialRootProps?: Record<string, unknown>
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
  const rootNode = createRootVirtualNode(state)

  /* 交由渲染器负责真正的 DOM 挂载，并让组件 effect 托管更新。 */
  state.config.render(rootNode, target)
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
  state.config.unmount(state.container)
  state.status = 'idle'
  state.container = undefined
}

/**
 * 通过最新状态生成根级 virtualNode，确保 props 是独立副本。
 */
function createRootVirtualNode<HostElement>(state: AppState<HostElement>) {
  const rawProps = state.initialRootProps
    ? ({ ...state.initialRootProps } as ElementProps<SetupFunctionComponent>)
    : undefined

  return createVirtualNode({
    type: state.rootComponent,
    rawProps,
  })
}

/**
 * 创建应用实例，封装 mount/unmount 生命周期与状态管理。
 */
export function createAppInstance<HostElement>(
  config: AppRuntimeConfig<HostElement>,
  rootComponent: SetupFunctionComponent,
  initialRootProps?: Record<string, unknown>,
): AppInstance<HostElement> {
  const state: AppState<HostElement> = {
    status: 'idle',
    container: undefined,
    config,
    rootComponent,
    initialRootProps,
  }

  /* 用户态 mount 会透传容器给核心挂载逻辑。 */
  function mount(target: HostElement): void {
    mountApp(state, target)
  }

  /* `unmount` 暴露为实例方法，便于控制生命周期。 */
  function unmount(): void {
    unmountApp(state)
  }

  return {
    mount,
    unmount,
  }
}
