/**
 * runtime-dom 负责整合 DOM 宿主的渲染器与应用创建逻辑。
 */
import type { ComponentType } from '@/jsx/vnode'
import { createAppAPI, createRenderer } from '@/runtime-core'
import { domRendererOptions } from './rendererOptions.ts'

const { render, clear } = createRenderer(domRendererOptions)
const baseCreateApp = createAppAPI<Element>(render, clear)

export { render }

/**
 * 基于 DOM 宿主能力的 createApp，实现字符串选择器解析等平台逻辑。
 */
export function createApp(
  rootComponent: ComponentType,
  rootProps?: Record<string, unknown>,
) {
  const app = baseCreateApp(rootComponent, rootProps)
  const baseMount = app.mount

  return {
    ...app,
    mount(target: string | Element) {
      const container = resolveContainer(target)

      if (!container) {
        throw new Error('createApp: 未找到可用的挂载容器')
      }

      baseMount(container)
    },
  }
}

function resolveContainer(target: string | Element): Element | null {
  if (typeof target === 'string') {
    return document.querySelector(target)
  }

  return target
}
