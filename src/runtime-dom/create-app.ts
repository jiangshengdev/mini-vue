/**
 * DOM 宿主的应用创建与挂载模块。
 *
 * 本模块负责整合 DOM 宿主的渲染器与应用创建逻辑，提供：
 * - `createApp`：创建基于 DOM 的应用实例，支持字符串选择器挂载
 * - `renderDomRoot`：根级渲染函数，可直接挂载 JSX 或组件树
 *
 * 与 runtime-core 的关系：
 * - 复用 runtime-core 的 `createRenderer` 创建 DOM 渲染器
 * - 复用 runtime-core 的 `createAppInstance` 创建基础应用实例
 * - 在此基础上封装 DOM 特有的容器解析、HMR 生命周期等逻辑
 */
import { domRendererOptions } from './renderer-options.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { runtimeDomContainerNotFound } from '@/messages/index.ts'
import type { AppInstance } from '@/runtime-core/index.ts'
import { createAppInstance, createRenderer } from '@/runtime-core/index.ts'
import type { PropsShape } from '@/shared/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

const { render: renderDomRootImpl, unmount: unmountContainer } = createRenderer(domRendererOptions)

/**
 * DOM 宿主复用的根级渲染函数，可直接挂载 JSX 或组件树。
 *
 * @public
 */
export const renderDomRoot = renderDomRootImpl

/**
 * DOM 宿主应用的内部状态。
 *
 * 保存 runtime-core 返回的基础实例以及 DOM 特有的挂载信息，
 * 用于支持容器解析、HMR 重挂载等场景。
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
 * Vite HMR 生命周期的订阅状态。
 *
 * 用于追踪是否已注册 HMR 回调，以及热更新后是否需要重新挂载。
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
  /* 字符串容器走 querySelector，以支持常见挂载写法如 `#app`。 */
  if (typeof target === 'string') {
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
 * DOM 版本的 mount，负责解析容器并委托基础实例挂载。
 *
 * @param state - 应用内部状态
 * @param target - CSS 选择器字符串或 DOM 元素
 * @throws 若容器解析失败则抛出错误
 */
function mountDomApp(state: DomAppState, target: string | Element): void {
  /* 统一将字符串选择器转换为真实节点，方便后续复用。 */
  const container = resolveContainer(target)

  /* 若用户未提供有效容器，立即报错避免静默失败。 */
  if (!container) {
    throw new Error(runtimeDomContainerNotFound, { cause: target })
  }

  state.lastMountTarget = target
  state.lastResolvedContainer = container

  /* 将解析好的容器传递给 runtime-core 实例执行挂载。 */
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
  /* 优先复用上次解析出的真实容器，确保 remount 快速执行。 */
  let target: string | Element | undefined = state.lastResolvedContainer

  /* 若节点已断开连接，重新根据字符串选择器解析，保证挂载位置可恢复。 */
  if (
    target instanceof Element &&
    !target.isConnected &&
    typeof state.lastMountTarget === 'string'
  ) {
    target = state.lastMountTarget
  }

  /* 若清理过程中丢失真实节点，退回到原始 mount 目标。 */
  if (!target && state.lastMountTarget) {
    target = state.lastMountTarget
  }

  /* 两种来源都不存在时代表无法确定容器，直接跳过。 */
  if (!target) {
    return
  }

  /* 使用最新推断出的容器重新拉起整棵 DOM 子树。 */
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
 * 注入 Vite HMR 生命周期回调。
 *
 * 确保热更新前后正确卸载/重建应用，避免状态残留或重复挂载。
 *
 * 注册的回调：
 * - `vite:beforeUpdate`/`vite:beforeFullReload`：卸载当前应用
 * - `vite:afterUpdate`：若需要则重新挂载
 * - `dispose`：模块销毁时卸载应用
 *
 * @param state - 应用内部状态
 */
function ensureDomHmrLifecycle(state: DomAppState): void {
  /* 仅在 Vite Dev 环境下存在 import.meta.hot。 */
  const { hot } = import.meta

  /* 当 HMR 环境不存在时无需注册任何回调。 */
  if (!hot) {
    return
  }

  /* 已注册过同一实例的回调时避免重复监听。 */
  if (state.hmr?.registered) {
    return
  }

  /* 每次注入时都创建独立状态，追踪是否需要二次挂载。 */
  const hmrState: DomAppHmrState = {
    registered: true,
    pendingRemount: false,
  }

  state.hmr = hmrState

  /* 当 HMR 即将替换模块时先记录当前容器并卸载，释放副作用。 */
  const prepareRemount = () => {
    if (!state.isMounted) {
      return
    }

    hmrState.pendingRemount = Boolean(state.lastMountTarget)
    unmountDomApp(state)
  }

  /* 模块热更新完成后若需要，重新挂载到同一容器。 */
  const remountIfNeeded = () => {
    if (!hmrState.pendingRemount) {
      return
    }

    hmrState.pendingRemount = false
    remountDomApp(state)
  }

  /* 针对 Vite 的 before/after 钩子注册挂载/卸载逻辑。 */
  hot.on('vite:beforeUpdate', prepareRemount)
  hot.on('vite:beforeFullReload', prepareRemount)
  hot.on('vite:afterUpdate', remountIfNeeded)

  /* Vite 触发 dispose 时若仍挂载，需要显式卸载容器。 */
  hot.dispose(() => {
    if (!state.isMounted) {
      return
    }

    unmountDomApp(state)
  })
}
