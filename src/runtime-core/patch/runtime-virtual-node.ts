import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RuntimeVirtualNode } from '../virtual-node.ts'
import { asRuntimeVirtualNode } from '../virtual-node.ts'
import { runtimeCoreMissingHostNodes } from '@/messages/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/** 带运行时元数据的 `virtualNode`（`patch` 阶段只处理已 normalize 的 `virtualNode`）。 */
export type RuntimeNormalizedVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
> = RuntimeVirtualNode<HostNode, HostElement, HostFragment> & NormalizedVirtualNode

/** 将 normalize 后的 `virtualNode` 断言为 runtime `virtualNode`，统一出口便于后续收紧。 */
export function asRuntimeNormalizedVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(virtualNode: NormalizedVirtualNode): RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment> {
  return asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(virtualNode) as RuntimeNormalizedVirtualNode<
    HostNode,
    HostElement,
    HostFragment
  >
}

/** 读取 `virtualNode` 对应的宿主节点集合（`Fragment`/组件/元素/文本统一）。 */
export function getHostNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(virtualNode: NormalizedVirtualNode): HostNode[] {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  return runtime.handle?.nodes ?? []
}

/** 读取 `virtualNode` 对应的首个宿主节点，用于作为插入锚点。 */
export function getFirstHostNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(virtualNode: NormalizedVirtualNode): HostNode | undefined {
  const nodes = getHostNodes<HostNode, HostElement, HostFragment>(virtualNode)

  return nodes.length > 0 ? nodes[0] : undefined
}

/**
 * 防御性读取宿主节点：当 `handle` 缺失或未写入宿主引用时给出调试提示。
 */
export function ensureHostNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(virtualNode: NormalizedVirtualNode): HostNode[] {
  const nodes = getHostNodes<HostNode, HostElement, HostFragment>(virtualNode)

  if (nodes.length === 0 && __DEV__) {
    console.warn(runtimeCoreMissingHostNodes, virtualNode)
  }

  return nodes
}
