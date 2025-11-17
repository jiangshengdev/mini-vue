import type { ComponentType, VNode } from '@/jsx/vnode'
import type { RendererOptions } from '../renderer.ts'
import { mountComponent } from './mountComponent.ts'
import { mountElement } from './mountElement.ts'

/**
 * 将通用 VNode 分派给组件或元素挂载路径。
 */
export function mountVNode<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  vnode: VNode,
  container: HostElement | HostFragment,
): HostNode | null {
  /* 函数组件通过 mountComponent 执行并挂载其返回值。 */
  if (typeof vnode.type === 'function') {
    const component = vnode.type as ComponentType

    return mountComponent(
      options,
      component,
      vnode as VNode<ComponentType>,
      container,
    )
  }

  /* 普通标签名直接走元素挂载逻辑。 */
  return mountElement(options, vnode.type, vnode, container)
}
