import type { VirtualNodeChild } from '@/jsx'
import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mount-child.ts'

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
): void {
  /* 顺序遍历子节点，统一交由 mountChild 处理细分类型。 */
  for (const child of children) {
    mountChild(options, child, container)
  }
}
