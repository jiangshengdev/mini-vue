import type { ComponentResult } from '@/jsx'
import { isVirtualNode } from '@/jsx'
import type { RendererOptions } from '../renderer.ts'
import { mountVirtualNode } from './mount-virtual-node.ts'

/**
 * 根据子节点类型生成宿主节点，统一处理数组、virtualNode 与原始值。
 */
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

  /* null、undefined、布尔值不产生实际节点。 */
  if (child == null || typeof child === 'boolean') {
    return null
  }

  /* 数组子节点需要借助片段统一插入。 */
  if (Array.isArray(child)) {
    const fragment = createFragment()

    /* 递归挂载数组项并收集到片段中。 */
    for (const item of child) {
      const node = mountChild(options, item, fragment)

      if (node) {
        appendChild(fragment, node)
      }
    }

    appendChild(container, fragment)

    return fragment
  }

  /* 原始文本类型直接创建文本节点。 */
  if (typeof child === 'string' || typeof child === 'number') {
    const text = createText(String(child))

    appendChild(container, text)

    return text
  }

  /* 标准 virtualNode 交给 mountVirtualNode 处理组件或元素。 */
  if (isVirtualNode(child)) {
    return mountVirtualNode(options, child, container)
  }

  /* 其他值（如对象）兜底转成字符串输出。 */
  const text = createText(String(child))

  appendChild(container, text)

  return text
}
