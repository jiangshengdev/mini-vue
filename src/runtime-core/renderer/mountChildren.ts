import type { VNodeChild } from '@/jsx/vnode'
import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mountChild.ts'

export function mountChildren<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  children: VNodeChild[],
  container: HostElement,
): void {
  for (const child of children) {
    mountChild(options, child, container)
  }
}
