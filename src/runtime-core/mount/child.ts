import type { RendererOptions } from '../index.ts'
import { asRuntimeVNode } from '../vnode.ts'
import type { MountContext } from './context.ts'
import type { MountedHandle } from './handle.ts'
import { mountVirtualNode } from './virtual-node.ts'
import type { RenderOutput, VirtualNode } from '@/jsx-foundation/index.ts'
import { isVirtualNode, Text } from '@/jsx-foundation/index.ts'
import { runtimeCoreObjectChildWarning } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/**
 * 根据子节点类型生成宿主节点，统一处理数组、virtualNode 与原始值。
 */
export function mountChild<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  child: RenderOutput | undefined,
  container: HostElement | HostFragment,
  context?: MountContext,
): MountedHandle<HostNode> | undefined {
  /* `shouldUseAnchor` 表示“当前节点之后是否还有兄弟”，用于决定是否需要占位锚点来保序。 */
  const shouldUseAnchor = context?.shouldUseAnchor ?? false
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
      return mountChild(options, child[0], container, { ...context, shouldUseAnchor })
    }

    const startAnchor = createText('')
    const endAnchor = createText('')
    const nodes: HostNode[] = [startAnchor]
    const teardowns: Array<(skipRemove?: boolean) => void> = []
    let ok = true

    appendChild(container, startAnchor)

    /* 子项始终视为有后续兄弟，以 endAnchor 充当边界。 */
    for (const item of child) {
      const mounted = mountChild(options, item, container, { ...context, shouldUseAnchor: true })

      if (mounted) {
        ok &&= mounted.ok

        for (const node of mounted.nodes) {
          nodes.push(node)
        }

        teardowns.push(mounted.teardown)
      }
    }

    appendChild(container, endAnchor)
    nodes.push(endAnchor)

    return {
      ok,
      nodes,
      /**
       * 先按“子项挂载顺序”执行 teardown，再移除边界锚点。
       *
       * @remarks
       * - 这里不直接 remove(nodes) 是为了保留子项各自的清理语义（effect/refs 等）。
       */
      teardown(skipRemove?: boolean): void {
        for (const teardown of teardowns) {
          teardown(skipRemove)
        }

        if (skipRemove) {
          return
        }

        remove(startAnchor)
        remove(endAnchor)
      },
    }
  }

  /* 标准 virtualNode 交给 mountVirtualNode 处理组件或元素。 */
  if (isVirtualNode(child)) {
    if (child.type === Text) {
      const textNode = createText(
        (child as VirtualNode<typeof Text> & { text?: string }).text ?? '',
      )
      const runtime = asRuntimeVNode<HostNode, HostElement, HostFragment>(child)

      appendChild(container, textNode)

      const handle: MountedHandle<HostNode> = {
        ok: true,
        nodes: [textNode],
        teardown(skipRemove?: boolean): void {
          if (skipRemove) {
            return
          }

          remove(textNode)
        },
      }

      runtime.el = textNode
      runtime.handle = handle
      runtime.anchor = undefined
      runtime.component = undefined

      return handle
    }

    return mountVirtualNode(options, child, container, { ...context, shouldUseAnchor })
  }

  /* 原始文本类型直接创建文本节点。 */
  if (typeof child === 'string' || typeof child === 'number') {
    const text = createText(String(child))

    appendChild(container, text)

    return {
      ok: true,
      nodes: [text],
      /** 卸载文本节点：仅需从宿主树中移除即可。 */
      teardown(skipRemove?: boolean): void {
        if (skipRemove) {
          return
        }

        remove(text)
      },
    }
  }

  /* 其他不受支持值统一忽略：开发期警告以提示用户修正输出。 */
  if (__DEV__) {
    console.warn(runtimeCoreObjectChildWarning, child)
  }

  return undefined
}
