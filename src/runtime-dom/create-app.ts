/**
 * runtime-dom 负责整合 DOM 宿主的渲染器与应用创建逻辑。
 */
import type { ComponentType } from '@/jsx'
import type { AppInstance } from '@/runtime-core'
import { createAppInstance, createRenderer } from '@/runtime-core'
import { domRendererOptions } from './renderer-options.ts'

const { render, clear } = createRenderer(domRendererOptions)

export { render }

/**
 * DOM 宿主应用内部状态，保存 runtime-core 返回的基础实例。
 */
interface DomAppState {
  /** runtime-core 的通用应用实例，用来执行真正的渲染逻辑。 */
  baseApp: AppInstance<Element>
}

/**
 * 根据字符串选择器或直接传入的节点解析出真实容器。
 */
function resolveContainer(target: string | Element): Element | null {
  /* 字符串容器走 querySelector，以支持常见挂载写法。 */
  if (typeof target === 'string') {
    return document.querySelector(target)
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

  /* 将解析好的容器传递给 runtime-core 实例执行挂载。 */
  state.baseApp.mount(container)
}

/**
 * DOM 版本的 unmount，直接复用基础实例的清理逻辑。
 */
function unmountDomApp(state: DomAppState): void {
  state.baseApp.unmount()
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
  rootComponent: ComponentType,
  rootProps?: Record<string, unknown>,
): DomAppInstance {
  /* 先创建 runtime-core 层的基础应用实例，统一托管渲染。 */
  const state: DomAppState = {
    baseApp: createAppInstance({ render, clear }, rootComponent, rootProps),
  }

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
