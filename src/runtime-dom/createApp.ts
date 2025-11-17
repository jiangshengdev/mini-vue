/**
 * runtime-dom 负责整合 DOM 宿主的渲染器与应用创建逻辑。
 */
import type { ComponentType } from '@/jsx/vnode'
import type { AppInstance } from '@/runtime-core'
import { createAppInstance, createRenderer } from '@/runtime-core'
import { domRendererOptions } from './rendererOptions.ts'

const { render, clear } = createRenderer(domRendererOptions)

export { render }

interface DomAppState {
  baseApp: AppInstance<Element>
}

function resolveContainer(target: string | Element): Element | null {
  if (typeof target === 'string') {
    return document.querySelector(target)
  }

  return target
}

function mountDomApp(state: DomAppState, target: string | Element): void {
  const container = resolveContainer(target)

  if (!container) {
    throw new Error('createApp: 未找到可用的挂载容器')
  }

  state.baseApp.mount(container)
}

function unmountDomApp(state: DomAppState): void {
  state.baseApp.unmount()
}

/**
 * 基于 DOM 宿主能力的 createApp，实现字符串选择器解析等平台逻辑。
 */
export interface DomAppInstance extends AppInstance<Element> {
  mount(target: string | Element): void
}

export function createApp(
  rootComponent: ComponentType,
  rootProps?: Record<string, unknown>,
): DomAppInstance {
  const state: DomAppState = {
    baseApp: createAppInstance({ render, clear }, rootComponent, rootProps),
  }

  function mount(target: string | Element): void {
    mountDomApp(state, target)
  }

  function unmount(): void {
    unmountDomApp(state)
  }

  return {
    ...state.baseApp,
    mount,
    unmount,
  }
}
