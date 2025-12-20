import type { ComponentInstance } from './component/context.ts'
import type { MountedHandle } from './mount/handle.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'

/**
 * 运行时附加元信息的 `virtualNode`，便于挂载与 `diff` 阶段复用宿主节点。
 */

export interface RuntimeVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> extends VirtualNode {
  /** 对应宿主节点引用，组件时为根节点，`Fragment` 为首节点。 */
  el?: HostNode
  /** `Fragment` 的尾锚点或子节点范围末尾，用于批量插入时定位。 */
  anchor?: HostNode
  /** 若为组件 `vnode`，指向其组件实例，便于后续更新与卸载。 */
  component?: ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>
  /** 当前 `vnode` 的挂载句柄，封装节点集合与 `teardown` 能力。 */
  handle?: MountedHandle<HostNode>
}

/**
 * 将普通 `virtualNode` 断言为运行时增强形态，供挂载路径写入元信息。
 */

export function asRuntimeVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(virtualNode: VirtualNode): RuntimeVirtualNode<HostNode, HostElement, HostFragment> {
  return virtualNode as RuntimeVirtualNode<HostNode, HostElement, HostFragment>
}
