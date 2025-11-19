import type { RendererOptions } from '../renderer.ts'
import { mountComponent } from './mount-component.ts'
import { mountElement } from './mount-element.ts'
import type { ComponentType, VirtualNode } from '@/jsx/index.ts'

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
): HostNode | undefined {
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
