/**
 * 平台无关的 createApp 工厂，仅处理组件渲染与生命周期状态。
 */
import type { ComponentType } from '@/jsx/vnode'
import type { RootRenderFunction } from './renderer.ts'

/**
 * createApp 返回的应用实例接口，提供挂载与卸载能力。
 */
export interface AppInstance<HostElement> {
  /** 将根组件渲染到指定容器中。 */
  mount(target: HostElement): void
  /** 卸载当前应用并执行容器清理。 */
  unmount(): void
}

/**
 * 生成平台通用的 createApp 实现，依赖外部注入的 render 与清理逻辑。
 */
export function createAppAPI<HostElement>(
  render: RootRenderFunction<HostElement>,
  clear: (container: HostElement) => void,
) {
  return function createApp(
    rootComponent: ComponentType,
    rootProps?: Record<string, unknown>,
  ): AppInstance<HostElement> {
    let isMounted = false
    let container: HostElement | null = null

    function mount(target: HostElement): void {
      if (isMounted) {
        throw new Error('createApp: 当前应用已挂载，不能重复执行 mount')
      }

      container = target

      const subtree = rootComponent({ ...(rootProps ?? {}) })

      render(subtree, container)
      isMounted = true
    }

    function unmount(): void {
      if (!container) {
        return
      }

      clear(container)
      isMounted = false
      container = null
    }

    return {
      mount,
      unmount,
    }
  }
}
