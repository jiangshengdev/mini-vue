import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RuntimeVNode } from '../vnode.ts'
import { asRuntimeVNode } from '../vnode.ts'
import { __DEV__ } from '@/shared/index.ts'

/** 带运行时元数据的 `vnode`（`patch` 阶段只处理已 normalize 的 `vnode`）。 */
export type RuntimeNormalizedVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
> = RuntimeVNode<HostNode, HostElement, HostFragment> & NormalizedVirtualNode

/** 将 normalize 后的 `vnode` 断言为 runtime `vnode`，统一出口便于后续收紧。 */
export function asRuntimeNormalizedVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(vnode: NormalizedVirtualNode): RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment> {
  return asRuntimeVNode<HostNode, HostElement, HostFragment>(vnode) as RuntimeNormalizedVirtualNode<
    HostNode,
    HostElement,
    HostFragment
  >
}

/** 读取 `vnode` 对应的宿主节点集合（`Fragment`/组件/元素/文本统一）。 */
export function getHostNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(vnode: NormalizedVirtualNode): HostNode[] {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(vnode)

  return runtime.handle?.nodes ?? []
}

/** 读取 `vnode` 对应的首个宿主节点，用于作为插入锚点。 */
export function getFirstHostNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(vnode: NormalizedVirtualNode): HostNode | undefined {
  const nodes = getHostNodes<HostNode, HostElement, HostFragment>(vnode)

  return nodes.length > 0 ? nodes[0] : undefined
}

/**
 * 防御性读取宿主节点：当 `handle` 缺失或未写入宿主引用时给出调试提示。
 */
export function ensureHostNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(vnode: NormalizedVirtualNode): HostNode[] {
  const nodes = getHostNodes<HostNode, HostElement, HostFragment>(vnode)
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(vnode)
  const withAnchor =
    runtime.anchor && !nodes.includes(runtime.anchor) ? [...nodes, runtime.anchor] : nodes

  if (withAnchor.length === 0 && __DEV__) {
    console.warn('[runtime-core] missing host nodes for vnode during move/anchor resolution', vnode)
  }

  return withAnchor
}
