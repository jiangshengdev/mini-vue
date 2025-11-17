import type { ComponentType, ElementProps, VNode } from '@/jsx/vnode'
import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mountChild.ts'

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
  vnode: VNode<T>,
  container: HostElement | HostFragment,
): HostNode | null {
  const props = (vnode.props ? { ...vnode.props } : {}) as ElementProps<T>
  const childCount = vnode.children.length

  /* 单个子节点直接展开为 children，模拟 React JSX 行为。 */
  if (childCount === 1) {
    props.children = vnode.children[0]
  } else if (childCount > 1) {
    /* 多个子节点打包成数组，方便组件内部批量消费。 */
    props.children = vnode.children
  }

  /* 执行组件函数拿到新的子树，再交由 mountChild 递归处理。 */
  const subtree = component(props)

  return mountChild(options, subtree, container)
}
