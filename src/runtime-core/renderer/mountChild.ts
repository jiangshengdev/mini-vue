import type { ComponentResult } from '@/jsx/vnode'
import { isVNode } from '@/jsx/vnode'
import type { RendererOptions } from '../renderer.ts'
import { mountVNode } from './mountVNode.ts'

export function mountChild<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  child: ComponentResult,
  container: HostElement | HostFragment,
): HostNode | null {
  const { createFragment, appendChild, createText } = options

  if (child == null || typeof child === 'boolean') {
    return null
  }

  if (Array.isArray(child)) {
    const fragment = createFragment()

    for (const item of child) {
      const node = mountChild(options, item, fragment)

      if (node) {
        appendChild(fragment, node)
      }
    }

    appendChild(container, fragment)

    return fragment
  }

  if (typeof child === 'string' || typeof child === 'number') {
    const text = createText(String(child))

    appendChild(container, text)

    return text
  }

  if (isVNode(child)) {
    return mountVNode(options, child, container)
  }

  const text = createText(String(child))

  appendChild(container, text)

  return text
}
