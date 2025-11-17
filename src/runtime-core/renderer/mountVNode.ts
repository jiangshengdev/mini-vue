import type { ComponentType, VNode } from '@/jsx/vnode'
import type { RendererOptions } from '../renderer.ts'
import { mountComponent } from './mountComponent.ts'
import { mountElement } from './mountElement.ts'

export function mountVNode<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  vnode: VNode,
  container: HostElement | HostFragment,
): HostNode | null {
  if (typeof vnode.type === 'function') {
    const component = vnode.type as ComponentType

    return mountComponent(
      options,
      component,
      vnode as VNode<ComponentType>,
      container,
    )
  }

  return mountElement(options, vnode.type, vnode, container)
}
