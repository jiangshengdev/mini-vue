import type { ComponentType } from './vnode'
import { render } from './renderer'

/**
 * createApp 返回的应用实例接口，提供挂载与卸载能力。
 */
interface AppInstance {
  /** 将根组件渲染到指定容器中。 */
  mount(target: string | Element): void
  /** 卸载当前应用并清空挂载容器内容。 */
  unmount(): void
}

/**
 * 创建一个简化版应用实例，通过根组件驱动一次性渲染。
 */
export function createApp(
  rootComponent: ComponentType,
  rootProps?: Record<string, unknown>,
): AppInstance {
  let isMounted = false
  let container: Element | null = null

  /**
   * 挂载入口：解析容器并执行根组件渲染逻辑。
   */
  function mount(target: string | Element): void {
    if (isMounted) {
      throw new Error('createApp: 当前应用已挂载，不能重复执行 mount')
    }

    container = resolveContainer(target)
    if (!container) {
      throw new Error('createApp: 未找到可用的挂载容器')
    }

    /* 根组件以函数形式调用，生成要挂载的 VNode 子树 */
    const subtree = rootComponent({ ...(rootProps ?? {}) })
    render(subtree, container)
    isMounted = true
  }

  /**
   * 卸载入口：清空容器并重置挂载状态。
   */
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

/**
 * 将传入的挂载目标统一解析为 DOM 元素。
 */
function resolveContainer(target: string | Element): Element | null {
  if (typeof target === 'string') {
    return document.querySelector(target)
  }
  return target
}
