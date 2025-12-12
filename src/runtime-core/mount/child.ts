import type { RendererOptions } from '../index.ts'
import type { MountContext } from './context.ts'
import { mountVirtualNode } from './virtual-node.ts'
import type { MountedHandle } from './handle.ts'
import type { RenderOutput } from '@/jsx-foundation/index.ts'
import { isVirtualNode } from '@/jsx-foundation/index.ts'
import { isNil } from '@/shared/index.ts'

/**
 * 根据子节点类型生成宿主节点，统一处理数组、virtualNode 与原始值。
 */
export function mountChild<HostNode, HostElement extends HostNode, HostFragment extends HostNode>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  child: RenderOutput | undefined,
  container: HostElement | HostFragment,
  context?: MountContext,
): MountedHandle<HostNode> | undefined {
  const needsAnchor = context?.needsAnchor ?? false
  const { appendChild, createText, remove } = options

  /* `null`、`undefined`、布尔值不产生实际节点。 */
  if (isNil(child) || typeof child === 'boolean') {
    return undefined
  }

  /* 数组/Fragment 子节点以锚点包裹，避免共享 DocumentFragment；单个或空数组则直接复用子节点策略。 */
  if (Array.isArray(child)) {
    const childCount = child.length

    if (childCount === 0) {
      return undefined
    }

    if (childCount === 1) {
      return mountChild(options, child[0], container, { ...context, needsAnchor })
    }

    const startAnchor = createText('')
    const endAnchor = createText('')
    const nodes: HostNode[] = [startAnchor]
    const teardowns: Array<() => void> = []

    appendChild(container, startAnchor)

    /* 子项始终视为有后续兄弟，以 endAnchor 充当边界。 */
    for (const item of child) {
      const mounted = mountChild(options, item, container, { ...context, needsAnchor: true })

      if (mounted) {
        nodes.push(...mounted.nodes)
        teardowns.push(mounted.teardown)
      }
    }

    appendChild(container, endAnchor)
    nodes.push(endAnchor)

    return {
      nodes,
      teardown(): void {
        for (const teardown of teardowns) {
          teardown()
        }

        remove(startAnchor)
        remove(endAnchor)
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
    return mountVirtualNode(options, child, container, { ...context, needsAnchor })
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
