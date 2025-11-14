import type { ComponentType, VNodeChild } from './vnode.ts'
import { render } from './renderer.ts'

interface AppInstance {
  mount(target: string | Element): void
  unmount(): void
}

export function createApp(
  rootComponent: ComponentType,
  rootProps?: Record<string, unknown>,
): AppInstance {
  let isMounted = false
  let container: Element | null = null

  function mount(target: string | Element): void {
    if (isMounted) {
      throw new Error('createApp: 当前应用已挂载，不能重复执行 mount')
    }

    container = resolveContainer(target)
    if (!container) {
      throw new Error('createApp: 未找到可用的挂载容器')
    }

    const subtree = rootComponent({ ...(rootProps ?? {}) }) as
      | VNodeChild
      | VNodeChild[]
      | null
      | undefined
    render(subtree, container)
    isMounted = true
  }

  function unmount(): void {
    if (!container) {
      return
    }
    container.textContent = ''
    isMounted = false
    container = null
  }

  return {
    mount,
    unmount,
  }
}

function resolveContainer(target: string | Element): Element | null {
  if (typeof target === 'string') {
    return document.querySelector(target)
  }
  return target
}
