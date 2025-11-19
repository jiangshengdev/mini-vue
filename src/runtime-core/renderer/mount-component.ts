import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mount-child.ts'
import type { ComponentType, ElementProps, VirtualNode } from '@/jsx/index.ts'

/**
 * 执行函数组件并将返回的子树继续挂载到容器。
 */
export function mountComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  component: T,
  virtualNode: VirtualNode<T>,
  container: HostElement | HostFragment,
): HostNode | undefined {
  const props = (
    virtualNode.props ? { ...virtualNode.props } : {}
  ) as ElementProps<T>
  const childCount = virtualNode.children.length

  /* 单个子节点直接展开为 children，模拟 React JSX 行为。 */
  if (childCount === 1) {
    props.children = virtualNode.children[0]
  } else if (childCount > 1) {
    /* 多个子节点打包成数组，方便组件内部批量消费。 */
    props.children = virtualNode.children
  }

  /* 执行组件函数拿到新的子树，再交由 mountChild 递归处理。 */
  const subtree = component(props)

  return mountChild(options, subtree, container)
}
