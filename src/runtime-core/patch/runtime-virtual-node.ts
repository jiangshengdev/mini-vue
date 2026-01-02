/**
 * `patch` 阶段的 runtime vnode 适配，确保持有宿主节点等元信息。
 */
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

/**
 * 将 normalize 后的 `virtualNode` 断言为 runtime `virtualNode`，统一出口便于后续收紧。
 *
 * @remarks
 * 该函数仅做类型断言，不进行运行时校验；调用方需确保 `virtualNode` 来自合法的渲染流程。
 */
export function asRuntimeNormalizedVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(
  virtualNode: NormalizedVirtualNode,
): RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment> {
  return asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(
    virtualNode,
  ) as RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>
}

/**
 * 读取 `virtualNode` 对应的宿主节点集合（`Fragment`/组件/元素/文本统一）。
 *
 * @remarks
 * - 通过 `runtime.handle.nodes` 获取，`handle` 在 `mount` 阶段写入。
 * - 若 `handle` 不存在则返回空数组。
 */
export function getHostNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(virtualNode: NormalizedVirtualNode): HostNode[] {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  return runtime.handle?.nodes ?? []
}

/**
 * 读取 `virtualNode` 对应的首个宿主节点，用于作为插入锚点。
 *
 * @remarks
 * - 对于 `Fragment`/组件，返回其子树的第一个宿主节点。
 * - 对于元素/文本，返回其自身的宿主节点。
 */
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
export function getHostNodesSafely<
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
