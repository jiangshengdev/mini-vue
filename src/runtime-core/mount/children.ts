import type { MountContext } from '../environment.ts'
import type { RendererOptions } from '../index.ts'
import { mountChild } from './child.ts'
import type { MountedHandle } from './handle.ts'
import type { VirtualNodeChild } from '@/jsx-foundation/index.ts'

/**
 * 依次挂载元素的 `children`，保持声明顺序插入。
 *
 * @remarks
 * - 顺序遍历子节点，统一交由 `mountChild` 处理细分类型。
 * - 在存在后续兄弟时强制使用锚点，保持节点插入顺序。
 */
export function mountElementChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  children: VirtualNodeChild[],
  container: HostElement,
  context?: MountContext,
): Array<MountedHandle<HostNode>> {
  const mountedHandles: Array<MountedHandle<HostNode>> = []
  const parent = context?.parent
  const appContext = context?.appContext

  /* 顺序遍历子节点，统一交由 `mountChild` 处理细分类型。 */
  for (const [index, child] of children.entries()) {
    /* 在存在后续兄弟时强制使用锚点，保持节点插入顺序。 */
    const mounted = mountChild(options, child, {
      container,
      context: {
        shouldUseAnchor: index < children.length - 1,
        parent,
        appContext,
      },
    })

    if (mounted) {
      mountedHandles.push(mounted)
    }
  }

  return mountedHandles
}
