/**
 * `runtime-dom` 负责整合 DOM 宿主的渲染器与应用创建逻辑。
 */
import { domRendererOptions } from './renderer-options.ts'
import type { SetupFunctionComponent } from '@/jsx/index.ts'
import type { AppInstance } from '@/runtime-core/index.ts'
import { createAppInstance, createRenderer } from '@/runtime-core/index.ts'

const { render, unmount: unmountContainer } = createRenderer(domRendererOptions)

export { render }

/**
 * DOM 宿主应用内部状态，保存 runtime-core 返回的基础实例。
 */
interface DomAppState {
  /** `runtime-core` 的通用应用实例，用来执行真正的渲染逻辑。 */
  baseApp: AppInstance<Element>
  /** 最近一次 mount 调用时的原始目标，字符串或节点。 */
  lastMountTarget?: string | Element
  /** 最近一次解析得到的真实容器节点。 */
  lastResolvedContainer?: Element
  /** 标识当前 DOM 宿主是否已经处于挂载状态。 */
  isMounted: boolean
  /** 保存 HMR 生命周期注册信息，避免重复监听。 */
  hmr?: DomAppHmrState
}

interface DomAppHmrState {
  registered: boolean
  pendingRemount: boolean
}

/**
 * 根据字符串选择器或直接传入的节点解析出真实容器。
 */
function resolveContainer(target: string | Element): Element | undefined {
  /* 字符串容器走 querySelector，以支持常见挂载写法。 */
  if (typeof target === 'string') {
    return document.querySelector(target) ?? undefined
  }

  return target
}

/**
 * DOM 版本的 mount，负责解析容器并委托基础实例挂载。
 */
function mountDomApp(state: DomAppState, target: string | Element): void {
  /* 统一将字符串选择器转换为真实节点，方便后续复用。 */
  const container = resolveContainer(target)

  /* 若用户未提供有效容器，立即报错避免静默失败。 */
  if (!container) {
    throw new Error('createApp: 未找到可用的挂载容器')
  }

  state.lastMountTarget = target
  state.lastResolvedContainer = container

  /* 将解析好的容器传递给 runtime-core 实例执行挂载。 */
  state.baseApp.mount(container)
  state.isMounted = true
}

/**
 * DOM 版本的 unmount，直接复用基础实例的清理逻辑。
 */
function unmountDomApp(state: DomAppState): void {
  state.baseApp.unmount()
  state.isMounted = false
}

/**
 * 在 HMR 场景下复用最近一次容器数据重新挂载。
 */
function remountDomApp(state: DomAppState): void {
  let target: string | Element | undefined = state.lastResolvedContainer

  /* 断开连接后重新根据字符串选择器解析，保证挂载位置可恢复。 */
  if (
    target instanceof Element &&
    !target.isConnected &&
    typeof state.lastMountTarget === 'string'
  ) {
    target = state.lastMountTarget
  }

  if (!target && state.lastMountTarget) {
    target = state.lastMountTarget
  }

  if (!target) {
    return
  }

  mountDomApp(state, target)
}

/**
 * 基于 DOM 宿主能力的 createApp，实现字符串选择器解析等平台逻辑。
 */
export interface DomAppInstance extends AppInstance<Element> {
  /** 支持传入 CSS 选择器或真实节点的 mount 能力。 */
  mount(target: string | Element): void
}

/**
 * 创建基于 DOM 宿主的应用实例，实现字符串容器解析等平台差异。
 */
export function createApp(
  rootComponent: SetupFunctionComponent,
  rootProps?: Record<string, unknown>,
): DomAppInstance {
  /* 先创建 runtime-core 层的基础应用实例，统一托管渲染。 */
  const state: DomAppState = {
    baseApp: createAppInstance(
      { render, unmount: unmountContainer },
      rootComponent,
      rootProps,
    ),
    isMounted: false,
  }

  ensureDomHmrLifecycle(state)

  /* 封装 DOM 版本 mount，让用户可以传入不同类型的容器。 */
  function mount(target: string | Element): void {
    mountDomApp(state, target)
  }

  /* DOM 版本的 unmount 直接调用基础实例释放资源。 */
  function unmount(): void {
    unmountDomApp(state)
  }

  return {
    ...state.baseApp,
    mount,
    unmount,
  }
}

/**
 * 注入针对 Vite 的 HMR 生命周期，确保热更新前后正确卸载/重建。
 */
function ensureDomHmrLifecycle(state: DomAppState): void {
  /* 仅在 Vite Dev 环境下存在 `import.meta.hot`。 */
  const hot = import.meta.hot

  if (!hot) {
    return
  }

  if (state.hmr?.registered) {
    return
  }

  const hmrState: DomAppHmrState = {
    registered: true,
    pendingRemount: false,
  }

  state.hmr = hmrState

  const prepareRemount = () => {
    if (!state.isMounted) {
      return
    }

    hmrState.pendingRemount = Boolean(state.lastMountTarget)
    unmountDomApp(state)
  }

  const remountIfNeeded = () => {
    if (!hmrState.pendingRemount) {
      return
    }

    hmrState.pendingRemount = false
    remountDomApp(state)
  }

  hot.on('vite:beforeUpdate', prepareRemount)
  hot.on('vite:beforeFullReload', prepareRemount)
  hot.on('vite:afterUpdate', remountIfNeeded)

  hot.dispose(() => {
    if (!state.isMounted) {
      return
    }

    unmountDomApp(state)
  })
}
