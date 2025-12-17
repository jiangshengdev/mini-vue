import { mountChild } from '../mount/index.ts'
import type { RendererOptions } from '../renderer.ts'
import { asRuntimeVNode } from '../vnode.ts'
import type { ContainerLike, PatchContext } from './context.ts'
import { normalizeChildContext } from './context.ts'
import { findNextAnchor, hasKeys, isSameVirtualNode, moveNodes, unmount } from './utils.ts'
import type { VirtualNode, VirtualNodeChild } from '@/jsx-foundation/index.ts'

type PatchChildFunction<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> = (
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prev: VirtualNode | undefined,
  next: VirtualNode | undefined,
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
) => void

export function patchChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prevChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  const isKeyed = hasKeys(nextChildren) || hasKeys(prevChildren)

  if (isKeyed) {
    patchKeyedChildren(options, prevChildren, nextChildren, container, patchChild, anchor, context)

    return
  }

  patchUnkeyedChildren(options, prevChildren, nextChildren, container, patchChild, anchor, context)
}

function patchUnkeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prevChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  const commonLength = Math.min(prevChildren.length, nextChildren.length)

  for (let index = 0; index < commonLength; index += 1) {
    patchChild(
      options,
      prevChildren[index] as VirtualNode,
      nextChildren[index] as VirtualNode,
      container,
      anchor,
      normalizeChildContext(context, index, nextChildren.length),
    )
  }

  if (nextChildren.length > prevChildren.length) {
    for (let index = commonLength; index < nextChildren.length; index += 1) {
      const next = nextChildren[index] as VirtualNode
      const nextAnchor = findNextAnchor(nextChildren, index + 1, anchor)
      const mounted = mountChild(
        options,
        next,
        container,
        normalizeChildContext(context, index, nextChildren.length),
      )

      if (mounted && nextAnchor) {
        moveNodes(options, mounted.nodes, container, nextAnchor)
      }
    }
  } else if (prevChildren.length > nextChildren.length) {
    for (let index = commonLength; index < prevChildren.length; index += 1) {
      unmount(options, prevChildren[index] as VirtualNode)
    }
  }
}

function patchKeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prevChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  let oldStart = 0
  let newStart = 0
  let oldEnd = prevChildren.length - 1
  let newEnd = nextChildren.length - 1

  while (
    oldStart <= oldEnd &&
    newStart <= newEnd &&
    isSameVirtualNode(prevChildren[oldStart] as VirtualNode, nextChildren[newStart] as VirtualNode)
  ) {
    patchChild(
      options,
      prevChildren[oldStart] as VirtualNode,
      nextChildren[newStart] as VirtualNode,
      container,
      anchor,
      normalizeChildContext(context, newStart, nextChildren.length),
    )
    oldStart += 1
    newStart += 1
  }

  while (
    oldStart <= oldEnd &&
    newStart <= newEnd &&
    isSameVirtualNode(prevChildren[oldEnd] as VirtualNode, nextChildren[newEnd] as VirtualNode)
  ) {
    patchChild(
      options,
      prevChildren[oldEnd] as VirtualNode,
      nextChildren[newEnd] as VirtualNode,
      container,
      anchor,
      normalizeChildContext(context, newEnd, nextChildren.length),
    )
    oldEnd -= 1
    newEnd -= 1
  }

  if (oldStart > oldEnd) {
    const insertAnchor = findNextAnchor(nextChildren, newEnd + 1, anchor)

    for (let index = oldStart; index <= newEnd; index += 1) {
      const mounted = mountChild(
        options,
        nextChildren[index] as VirtualNode,
        container,
        normalizeChildContext(context, index, nextChildren.length),
      )

      if (mounted && insertAnchor) {
        moveNodes(options, mounted.nodes, container, insertAnchor)
      }
    }

    return
  }

  if (newStart > newEnd) {
    for (let index = oldStart; index <= oldEnd; index += 1) {
      unmount(options, prevChildren[index] as VirtualNode)
    }

    return
  }

  const keyToNewIndexMap = new Map<PropertyKey, number>()
  const toBePatched = newEnd - newStart + 1
  const newIndexToOldIndexMap = new Array<number>(toBePatched).fill(0)

  for (let index = newStart; index <= newEnd; index += 1) {
    const child = nextChildren[index] as VirtualNode

    if (child.key != null) {
      keyToNewIndexMap.set(child.key, index)
    }
  }

  for (let index = oldStart; index <= oldEnd; index += 1) {
    const prevChild = prevChildren[index] as VirtualNode
    const newIndex =
      prevChild.key != null
        ? keyToNewIndexMap.get(prevChild.key)
        : findUnkeyedMatch(prevChild, nextChildren, newStart, newEnd)

    if (newIndex === undefined) {
      unmount(options, prevChild)
    } else {
      newIndexToOldIndexMap[newIndex - newStart] = index + 1
      patchChild(
        options,
        prevChild,
        nextChildren[newIndex] as VirtualNode,
        container,
        anchor,
        normalizeChildContext(context, newIndex, nextChildren.length),
      )
    }
  }

  for (let index = toBePatched - 1; index >= 0; index -= 1) {
    const newIndex = newStart + index
    const nextChild = nextChildren[newIndex] as VirtualNode
    const anchorNode = findNextAnchor(nextChildren, newIndex + 1, anchor)

    if (newIndexToOldIndexMap[index] === 0) {
      const mounted = mountChild(
        options,
        nextChild,
        container,
        normalizeChildContext(context, newIndex, nextChildren.length),
      )

      if (mounted && anchorNode) {
        moveNodes(options, mounted.nodes, container, anchorNode)
      }
    } else {
      const prevIndex = newIndexToOldIndexMap[index] - 1
      const runtime = asRuntimeVNode<HostNode, HostElement, HostFragment>(
        prevChildren[prevIndex] as VirtualNode,
      )
      const nodes = runtime.handle?.nodes ?? []

      for (const node of nodes) {
        options.insertBefore(container, node, anchorNode)
      }
    }
  }
}

function findUnkeyedMatch(
  target: VirtualNode,
  list: VirtualNodeChild[],
  start: number,
  end: number,
): number | undefined {
  for (let index = start; index <= end; index += 1) {
    const candidate = list[index] as VirtualNode

    if (candidate.key == null && isSameVirtualNode(candidate, target)) {
      return index
    }
  }

  return undefined
}
