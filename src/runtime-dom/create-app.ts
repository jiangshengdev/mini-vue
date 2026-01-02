/**
 * DOM 宿主的应用创建与挂载入口，封装容器解析与 HMR 生命周期。
 *
 * 复用 runtime-core 的渲染器与应用实例，并扩展字符串选择器挂载等平台差异。
 */
import { domRendererOptions } from './renderer-options.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { runtimeDomContainerNotFound, runtimeDomDocumentUnavailable } from '@/messages/index.ts'
import type { AppInstance } from '@/runtime-core/index.ts'
import { createAppInstance, createRenderer } from '@/runtime-core/index.ts'
import type { PropsShape } from '@/shared/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

type DomRenderer = ReturnType<typeof createRenderer<Node, Element, DocumentFragment>>

let cachedDomRenderer: DomRenderer | undefined

/**
 * 懒创建并缓存 DOM 渲染器，避免重复实例化。
 *
 * @returns 共享的 DOM 渲染器实例
 */
function getDomRenderer(): DomRenderer {
  cachedDomRenderer ??= createRenderer(domRendererOptions)

  return cachedDomRenderer
}

/**
 * DOM 宿主复用的根级渲染函数。
 *
 * @param virtualNode - 要渲染的虚拟节点
 * @param container - 挂载目标容器
 * @returns 渲染执行结果
 * @public
 */
export const renderDomRoot: DomRenderer['render'] = (virtualNode, container) => {
  getDomRenderer().render(virtualNode, container)
}

/**
 * 卸载指定容器内的渲染树。
 *
 * @param container - 挂载目标元素
 */
function unmountContainer(container: Element): void {
  getDomRenderer().unmount(container)
}

/**
 * DOM 宿主应用的内部状态，记录基础实例与最近的容器解析结果，支撑 HMR 重挂载。
 */
interface DomAppState {
  /** Runtime-core 的通用应用实例，用来执行真正的渲染逻辑。 */
  baseApp: AppInstance<Element>
  /** 最近一次 mount 调用时的原始目标，字符串选择器或 DOM 节点。 */
  lastMountTarget?: string | Element
  /** 最近一次解析得到的真实容器节点，用于 HMR 重挂载。 */
  lastResolvedContainer?: Element
  /** 标识当前应用是否已处于挂载状态。 */
  isMounted: boolean
  /** HMR 生命周期状态，避免重复注册回调。 */
  hmr?: DomAppHmrState
}

/**
 * Vite HMR 生命周期的订阅状态，追踪注册情况与是否需要重新挂载。
 */
interface DomAppHmrState {
  /** 标识是否已向 HMR 注册回调。 */
  registered: boolean
  /** HMR 更新完成后是否需要重新挂载 DOM 树。 */
  pendingRemount: boolean
}

/**
 * 根据字符串选择器或 DOM 节点解析出真实容器。
 *
 * @param target - CSS 选择器字符串或 DOM 元素
 * @returns 解析得到的 DOM 元素，若选择器无匹配则返回 undefined
 */
function resolveContainer(target: string | Element): Element | undefined {
  if (typeof target === 'string') {
    if (typeof document === 'undefined') {
      return undefined
    }

    const resolved = runSilent(
      () => {
        return document.querySelector(target) ?? undefined
      },
      {
        origin: errorContexts.domContainerResolve,
        handlerPhase: errorPhases.sync,
        meta: { selector: target },
      },
    )

    return resolved ?? undefined
  }

  return target
}

/**
 * 判断入参是否具备 DOM 元素特征。
 *
 * @param value - 待校验的值
 * @returns 是否拥有元素节点的 `nodeType`
 */
function isDomElementLike(value: unknown): value is Element {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return (value as { nodeType?: unknown }).nodeType === 1
}

/**
 * DOM 版本的 mount，负责解析容器并委托基础实例挂载。
 *
 * @param state - 应用内部状态
 * @param target - CSS 选择器字符串或 DOM 元素
 * @throws 若容器解析失败则抛出错误
 */
function mountDomApp(state: DomAppState, target: string | Element): void {
  if (typeof document === 'undefined' && typeof target === 'string') {
    throw new TypeError(runtimeDomDocumentUnavailable, { cause: target })
  }

  const container = resolveContainer(target)

  if (!container) {
    throw new Error(runtimeDomContainerNotFound, { cause: target })
  }

  state.lastMountTarget = target
  state.lastResolvedContainer = container

  state.baseApp.mount(container)
  state.isMounted = true
}

/**
 * DOM 版本的 unmount，委托基础实例执行清理。
 *
 * @param state - 应用内部状态
 */
function unmountDomApp(state: DomAppState): void {
  state.baseApp.unmount()
  state.isMounted = false
}

/**
 * HMR 场景下复用最近一次容器数据重新挂载。
 *
 * 优先使用缓存的真实容器节点，若节点已断开连接则重新解析选择器。
 *
 * @param state - 应用内部状态
 */
function remountDomApp(state: DomAppState): void {
  let target: string | Element | undefined = state.lastResolvedContainer

  if (
    isDomElementLike(target) &&
    (target as { isConnected?: boolean }).isConnected === false &&
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
 * 基于 DOM 宿主的应用实例接口。
 *
 * 扩展 runtime-core 的 `AppInstance`，支持传入 CSS 选择器或真实节点的 mount 能力。
 *
 * @public
 */
export interface DomAppInstance extends AppInstance<Element> {
  /**
   * 将应用挂载到指定容器。
   *
   * @param target - CSS 选择器字符串或 DOM 元素
   */
  mount(target: string | Element): void
}

/**
 * 创建基于 DOM 宿主的应用实例，实现字符串容器解析等平台差异。
 *
 * @param rootComponent - 根组件
 * @param rootProps - 传递给根组件的初始 props
 * @returns 带 DOM 宿主能力的应用实例
 * @public
 */
export function createApp(rootComponent: SetupComponent, rootProps?: PropsShape): DomAppInstance {
  /* 先创建 runtime-core 层的基础应用实例，统一托管渲染。 */
  const state: DomAppState = {
    baseApp: createAppInstance(
      { render: renderDomRoot, unmount: unmountContainer },
      rootComponent,
      rootProps,
    ),
    isMounted: false,
  }

  ensureDomHmrLifecycle(state)

  /**
   * 将应用挂载到指定容器，支持字符串选择器。
   *
   * @param target - CSS 选择器或 DOM 元素
   */
  function mount(target: string | Element): void {
    mountDomApp(state, target)
  }

  /**
   * 卸载当前应用，释放 DOM 副作用。
   */
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
 * 注入 Vite HMR 生命周期回调，保障热更新时的卸载与按需重挂载。
 *
 * @param state - 应用内部状态
 */
function ensureDomHmrLifecycle(state: DomAppState): void {
  /* 仅在 Vite Dev 环境下存在 import.meta.hot；非 Vite/SSR 场景应安全降级。 */
  let hot: unknown

  try {
    hot = (import.meta as { hot?: unknown }).hot
  } catch {
    return
  }

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

  /**
   * 在 HMR 前置阶段标记需要重挂载并先卸载应用。
   */
  const prepareRemount = () => {
    if (!state.isMounted) {
      return
    }

    hmrState.pendingRemount = Boolean(state.lastMountTarget)
    unmountDomApp(state)
  }

  /**
   * 在 HMR 后置阶段按需重新挂载应用。
   */
  const remountIfNeeded = () => {
    if (!hmrState.pendingRemount) {
      return
    }

    hmrState.pendingRemount = false
    remountDomApp(state)
  }

  /* 针对 Vite 的 before/after 钩子注册挂载/卸载逻辑。 */
  ;(hot as { on: (event: string, cb: () => void) => void }).on('vite:beforeUpdate', prepareRemount)
  ;(hot as { on: (event: string, cb: () => void) => void }).on(
    'vite:beforeFullReload',
    prepareRemount,
  )
  ;(hot as { on: (event: string, cb: () => void) => void }).on('vite:afterUpdate', remountIfNeeded)

  /* Vite 触发 dispose 时若仍挂载，需要显式卸载容器。 */
  ;(hot as { dispose: (cb: () => void) => void }).dispose(() => {
    if (!state.isMounted) {
      return
    }

    unmountDomApp(state)
  })
}
