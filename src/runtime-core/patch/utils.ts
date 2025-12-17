import type { RendererOptions } from '../renderer.ts'
import { asRuntimeVNode } from '../vnode.ts'
import type { RuntimeVNode } from '../vnode.ts'
import { Text } from '@/jsx-foundation/index.ts'
import type { VirtualNode, VirtualNodeChild } from '@/jsx-foundation/index.ts'

export function unmount<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(options: RendererOptions<HostNode, HostElement, HostFragment>, vnode: VirtualNode): void {
  const runtime = asRuntimeVNode<HostNode, HostElement, HostFragment>(vnode)
  const { handle } = runtime

  if (handle) {
    handle.teardown()

    return
  }

  if (runtime.el) {
    options.remove(runtime.el)
  }
}

export function isSameVirtualNode(a: VirtualNode | undefined, b: VirtualNode | undefined): boolean {
  if (!a || !b) {
    return false
  }

  if (a.type === Text && b.type === Text) {
    return true
  }

  return a.type === b.type && a.key === b.key
}

export function moveNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  nodes: HostNode[],
  container: HostElement | HostFragment,
  anchor: HostNode,
): void {
  for (const node of nodes) {
    options.insertBefore(container, node, anchor)
  }
}

export function findNextAnchor<HostNode>(
  children: VirtualNodeChild[],
  startIndex: number,
  fallback: HostNode | undefined,
): HostNode | undefined {
  for (let index = startIndex; index < children.length; index += 1) {
    const runtime = asRuntimeVNode<HostNode>(children[index] as VirtualNode)
    const { handle } = runtime

    if (handle?.nodes?.length) {
      return handle.nodes[0]
    }
  }

  return fallback
}

export function hasKeys(children: VirtualNodeChild[]): boolean {
  return children.some((child) => {
    const vnode = child as VirtualNode

    return vnode?.key !== undefined && vnode?.key !== null
  })
}

export function syncRuntimeMetadata<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  runtimePrevious: RuntimeVNode<HostNode, HostElement, HostFragment>,
  runtimeNext: RuntimeVNode<HostNode, HostElement, HostFragment>,
  overrides?: {
    anchor?: HostNode | undefined
    component?: RuntimeVNode<HostNode, HostElement, HostFragment>['component']
  },
): void {
  runtimeNext.el = runtimePrevious.el
  runtimeNext.handle = runtimePrevious.handle

  runtimeNext.anchor =
    overrides && 'anchor' in overrides ? overrides.anchor : runtimePrevious.anchor
  runtimeNext.component =
    overrides && 'component' in overrides ? overrides.component : runtimePrevious.component
}
