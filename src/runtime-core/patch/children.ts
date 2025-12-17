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
  previous: VirtualNode | undefined,
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
  previousChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  const isKeyed = hasKeys(nextChildren) || hasKeys(previousChildren)

  if (isKeyed) {
    patchKeyedChildren(
      options,
      previousChildren,
      nextChildren,
      container,
      patchChild,
      anchor,
      context,
    )

    return
  }

  patchUnkeyedChildren(
    options,
    previousChildren,
    nextChildren,
    container,
    patchChild,
    anchor,
    context,
  )
}

function patchUnkeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  const commonLength = Math.min(previousChildren.length, nextChildren.length)

  for (let index = 0; index < commonLength; index += 1) {
    patchChild(
      options,
      previousChildren[index] as VirtualNode,
      nextChildren[index] as VirtualNode,
      container,
      anchor,
      normalizeChildContext(context, index, nextChildren.length),
    )
  }

  if (nextChildren.length > previousChildren.length) {
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
  } else if (previousChildren.length > nextChildren.length) {
    for (let index = commonLength; index < previousChildren.length; index += 1) {
      unmount(options, previousChildren[index] as VirtualNode)
    }
  }
}

function patchKeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  let oldStart = 0
  let newStart = 0
  let oldEnd = previousChildren.length - 1
  let newEnd = nextChildren.length - 1

  while (
    oldStart <= oldEnd &&
    newStart <= newEnd &&
    isSameVirtualNode(
      previousChildren[oldStart] as VirtualNode,
      nextChildren[newStart] as VirtualNode,
    )
  ) {
    patchChild(
      options,
      previousChildren[oldStart] as VirtualNode,
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
    isSameVirtualNode(previousChildren[oldEnd] as VirtualNode, nextChildren[newEnd] as VirtualNode)
  ) {
    patchChild(
      options,
      previousChildren[oldEnd] as VirtualNode,
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
      unmount(options, previousChildren[index] as VirtualNode)
    }

    return
  }

  const keyToNewIndexMap = new Map<PropertyKey, number>()
  const toBePatched = newEnd - newStart + 1
  const newIndexToOldIndexMap = Array.from({ length: toBePatched }, () => {
    return 0
  })

  for (let index = newStart; index <= newEnd; index += 1) {
    const child = nextChildren[index] as VirtualNode

    if (child.key !== undefined && child.key !== null) {
      keyToNewIndexMap.set(child.key, index)
    }
  }

  for (let index = oldStart; index <= oldEnd; index += 1) {
    const previousChild = previousChildren[index] as VirtualNode
    const newIndex =
      previousChild.key !== undefined && previousChild.key !== null
        ? keyToNewIndexMap.get(previousChild.key)
        : findUnkeyedMatch(previousChild, nextChildren, newStart, newEnd)

    if (newIndex === undefined) {
      unmount(options, previousChild)
    } else {
      newIndexToOldIndexMap[newIndex - newStart] = index + 1
      patchChild(
        options,
        previousChild,
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
      const previousIndex = newIndexToOldIndexMap[index] - 1
      const runtime = asRuntimeVNode<HostNode, HostElement, HostFragment>(
        previousChildren[previousIndex] as VirtualNode,
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

    if (
      (candidate.key === null || candidate.key === undefined) &&
      isSameVirtualNode(candidate, target)
    ) {
      return index
    }
  }

  return undefined
}
