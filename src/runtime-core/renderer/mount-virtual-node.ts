import type { RendererOptions } from '../renderer.ts'
import { mountComponent } from './mount-component.ts'
import { mountElement } from './mount-element.ts'
import { mountChild } from './mount-child.ts'
import type { MountedHandle } from './mounted-handle.ts'
import type { ComponentType, VirtualNode } from '@/jsx/index.ts'
import { Fragment } from '@/jsx/index.ts'

/**
 * 将通用 virtualNode 分派给组件或元素挂载路径。
 */
export function mountVirtualNode<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: VirtualNode,
  container: HostElement | HostFragment,
): MountedHandle<HostNode> | undefined {
  /* Fragment 直接展开自身 children，不走组件路径。 */
  if (virtualNode.type === Fragment) {
    return mountChild(options, virtualNode.children, container)
  }

  /* 函数组件通过 mountComponent 执行并挂载其返回值。 */
  if (typeof virtualNode.type === 'function') {
    const component = virtualNode.type as ComponentType

    return mountComponent(
      options,
      component,
      virtualNode as VirtualNode<ComponentType>,
      container,
    )
  }

  /* 普通标签名直接走元素挂载逻辑。 */
  return mountElement(options, virtualNode.type, virtualNode, container)
}
