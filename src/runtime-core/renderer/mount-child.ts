import type { RendererOptions } from '../renderer.ts'
import { mountVirtualNode } from './mount-virtual-node.ts'
import type { MountedChild } from './mounted-child.ts'
import type { ComponentResult } from '@/jsx/index.ts'
import { isVirtualNode } from '@/jsx/index.ts'
import { isNil } from '@/shared/utils.ts'

/**
 * 根据子节点类型生成宿主节点，统一处理数组、virtualNode 与原始值。
 */
export function mountChild<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  child: ComponentResult | undefined,
  container: HostElement | HostFragment,
): MountedChild<HostNode> | undefined {
  const { createFragment, appendChild, createText, remove } = options

  /* `null`、`undefined`、布尔值不产生实际节点。 */
  if (isNil(child) || typeof child === 'boolean') {
    return undefined
  }

  /* 数组子节点需要借助片段统一插入。 */
  if (Array.isArray(child)) {
    const fragment = createFragment()
    const nodes: HostNode[] = []
    const teardowns: Array<() => void> = []

    /* 递归挂载数组项并收集到片段中。 */
    for (const item of child) {
      const mounted = mountChild(options, item, fragment)

      if (mounted) {
        nodes.push(...mounted.nodes)
        teardowns.push(mounted.teardown)
      }
    }

    appendChild(container, fragment)

    if (nodes.length === 0) {
      return undefined
    }

    return {
      nodes,
      teardown(): void {
        for (const teardown of teardowns) {
          teardown()
        }
      },
    }
  }

  /* 原始文本类型直接创建文本节点。 */
  if (typeof child === 'string' || typeof child === 'number') {
    const text = createText(String(child))

    appendChild(container, text)

    return {
      nodes: [text],
      teardown(): void {
        remove(text)
      },
    }
  }

  /* 标准 virtualNode 交给 mountVirtualNode 处理组件或元素。 */
  if (isVirtualNode(child)) {
    return mountVirtualNode(options, child, container)
  }

  /* 其他值（如对象）兜底转成字符串输出。 */
  const text = createText(String(child))

  appendChild(container, text)

  return {
    nodes: [text],
    teardown(): void {
      remove(text)
    },
  }
}
