import type { ComponentType, ElementProps, VNode } from '@/jsx/vnode'
import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mountChild.ts'

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

  if (childCount === 1) {
    props.children = vnode.children[0]
  } else if (childCount > 1) {
    props.children = vnode.children
  }

  const subtree = component(props)

  return mountChild(options, subtree, container)
}
