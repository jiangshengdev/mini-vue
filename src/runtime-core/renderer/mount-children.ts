import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mount-child.ts'
import type { MountedChild } from './mounted-child.ts'
import type { VirtualNodeChild } from '@/jsx/index.ts'

/**
 * 依次挂载元素的 children，保持声明顺序插入。
 */
export function mountChildren<
  HostNode extends object,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  children: VirtualNodeChild[],
  container: HostElement,
): MountedChild<HostNode>[] {
  const mountedChildren: MountedChild<HostNode>[] = []

  /* 顺序遍历子节点，统一交由 mountChild 处理细分类型。 */
  for (const child of children) {
    const mounted = mountChild(options, child, container)

    if (mounted) {
      mountedChildren.push(mounted)
    }
  }

  return mountedChildren
}
