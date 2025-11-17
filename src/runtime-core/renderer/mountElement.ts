import type { VNode } from '@/jsx/vnode'
import type { RendererOptions } from '../renderer.ts'
import { mountChildren } from './mountChildren.ts'

export function mountElement<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  type: string,
  vnode: VNode,
  container: HostElement | HostFragment,
): HostNode {
  const { createElement, patchProps, appendChild } = options
  const el = createElement(type)
  const props = (vnode.props as Record<string, unknown> | null) ?? null

  patchProps(el, props)
  mountChildren(options, vnode.children, el)
  appendChild(container, el)

  return el
}
