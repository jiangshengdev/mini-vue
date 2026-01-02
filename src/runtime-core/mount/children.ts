/**
 * 元素子节点挂载助手：保持声明顺序逐个调用 `mountChild`。
 */
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
 * - 顺序挂载天然保证插入顺序，无需额外的「位置推断开关」。
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

  /* 顺序遍历子节点，统一交由 `mountChild` 处理细分类型。 */
  for (const child of children) {
    const mounted = mountChild(options, child, {
      container,
      context,
    })

    if (mounted) {
      mountedHandles.push(mounted)
    }
  }

  return mountedHandles
}
