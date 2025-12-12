import type { RendererOptions } from '../index.ts'
import type { AnyComponentInstance } from '../component/context.ts'
import { mountChild } from './child.ts'
import type { MountedHandle } from './handle.ts'
import type { VirtualNodeChild } from '@/jsx-foundation/index.ts'

/**
 * 依次挂载元素的 children，保持声明顺序插入。
 */
export function mountChildren<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  children: VirtualNodeChild[],
  container: HostElement,
  parent?: AnyComponentInstance,
): Array<MountedHandle<HostNode>> {
  const mountedHandles: Array<MountedHandle<HostNode>> = []

  /* 顺序遍历子节点，统一交由 mountChild 处理细分类型。 */
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]
    /* 在存在后续兄弟时强制使用锚点，保持节点插入顺序。 */
    const mounted = mountChild(options, child, container, index < children.length - 1, parent)

    if (mounted) {
      mountedHandles.push(mounted)
    }
  }

  return mountedHandles
}
