import type { MountContext } from '../mount/context.ts'
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
  environment: PatchChildEnvironment<HostNode, HostElement, HostFragment>,
) => void

interface PatchChildEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  container: ContainerLike<HostNode, HostElement, HostFragment>
  anchor?: HostNode
  context?: PatchContext | MountContext
}

interface PatchChildrenContext<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> extends PatchChildEnvironment<HostNode, HostElement, HostFragment> {
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>
}

interface IndexRange {
  oldStart: number
  newStart: number
  oldEnd: number
  newEnd: number
}

interface KeyedPatchState<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  options: RendererOptions<HostNode, HostElement, HostFragment>
  previousChildren: VirtualNodeChild[]
  nextChildren: VirtualNodeChild[]
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>
}

interface IndexMaps {
  keyToNewIndexMap: Map<PropertyKey, number>
  newIndexToOldIndexMap: number[]
  toBePatched: number
}

function createChildEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
  index: number,
  length: number,
): PatchChildEnvironment<HostNode, HostElement, HostFragment> & {
  context: ReturnType<typeof normalizeChildContext>
} {
  return {
    container: environment.container,
    anchor: environment.anchor,
    context: normalizeChildContext(environment.context, index, length),
  }
}

export function patchChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
): void {
  const isKeyed = hasKeys(nextChildren) || hasKeys(previousChildren)

  if (isKeyed) {
    patchKeyedChildren(options, previousChildren, nextChildren, environment)

    return
  }

  patchUnkeyedChildren(options, previousChildren, nextChildren, environment)
}

function patchUnkeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
): void {
  const commonLength = Math.min(previousChildren.length, nextChildren.length)

  for (let index = 0; index < commonLength; index += 1) {
    const childEnvironment = createChildEnvironment(environment, index, nextChildren.length)

    environment.patchChild(
      options,
      previousChildren[index] as VirtualNode,
      nextChildren[index] as VirtualNode,
      childEnvironment,
    )
  }

  if (nextChildren.length > previousChildren.length) {
    for (let index = commonLength; index < nextChildren.length; index += 1) {
      const next = nextChildren[index] as VirtualNode
      const nextAnchor = findNextAnchor(nextChildren, index + 1, environment.anchor)
      const childEnvironment = createChildEnvironment(environment, index, nextChildren.length)
      const mounted = mountChild(options, next, environment.container, childEnvironment.context)

      if (mounted && nextAnchor) {
        moveNodes(options, mounted.nodes, environment.container, nextAnchor)
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
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
): void {
  const state: KeyedPatchState<HostNode, HostElement, HostFragment> = {
    options,
    previousChildren,
    nextChildren,
    environment,
  }
  const range = createIndexRange(previousChildren.length, nextChildren.length)

  syncFromStart(state, range)
  syncFromEnd(state, range)

  if (range.oldStart > range.oldEnd) {
    insertRemainingChildren(state, range)

    return
  }

  if (range.newStart > range.newEnd) {
    removeRemainingChildren(state, range)

    return
  }

  const maps = buildIndexMaps(state, range)

  patchAlignedChildren(state, range, maps)
  moveOrMountChildren(state, range, maps)
}

function syncFromStart<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  while (
    range.oldStart <= range.oldEnd &&
    range.newStart <= range.newEnd &&
    isSameVirtualNode(
      state.previousChildren[range.oldStart] as VirtualNode,
      state.nextChildren[range.newStart] as VirtualNode,
    )
  ) {
    const childEnvironment = createChildEnvironment(
      state.environment,
      range.newStart,
      state.nextChildren.length,
    )

    state.environment.patchChild(
      state.options,
      state.previousChildren[range.oldStart] as VirtualNode,
      state.nextChildren[range.newStart] as VirtualNode,
      childEnvironment,
    )
    range.oldStart += 1
    range.newStart += 1
  }
}

function syncFromEnd<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  while (
    range.oldStart <= range.oldEnd &&
    range.newStart <= range.newEnd &&
    isSameVirtualNode(
      state.previousChildren[range.oldEnd] as VirtualNode,
      state.nextChildren[range.newEnd] as VirtualNode,
    )
  ) {
    const childEnvironment = createChildEnvironment(
      state.environment,
      range.newEnd,
      state.nextChildren.length,
    )

    state.environment.patchChild(
      state.options,
      state.previousChildren[range.oldEnd] as VirtualNode,
      state.nextChildren[range.newEnd] as VirtualNode,
      childEnvironment,
    )
    range.oldEnd -= 1
    range.newEnd -= 1
  }
}

function insertRemainingChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  const insertAnchor = findNextAnchor(
    state.nextChildren,
    range.newEnd + 1,
    state.environment.anchor,
  )

  for (let index = range.newStart; index <= range.newEnd; index += 1) {
    const childEnvironment = createChildEnvironment(
      state.environment,
      index,
      state.nextChildren.length,
    )
    const mounted = mountChild(
      state.options,
      state.nextChildren[index] as VirtualNode,
      state.environment.container,
      childEnvironment.context,
    )

    if (mounted && insertAnchor) {
      moveNodes(state.options, mounted.nodes, state.environment.container, insertAnchor)
    }
  }
}

function removeRemainingChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  for (let index = range.oldStart; index <= range.oldEnd; index += 1) {
    unmount(state.options, state.previousChildren[index] as VirtualNode)
  }
}

function buildIndexMaps<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): IndexMaps {
  const keyToNewIndexMap = new Map<PropertyKey, number>()
  const toBePatched = range.newEnd - range.newStart + 1
  const newIndexToOldIndexMap = Array.from({ length: toBePatched }, () => {
    return 0
  })

  for (let index = range.newStart; index <= range.newEnd; index += 1) {
    const child = state.nextChildren[index] as VirtualNode

    if (child.key !== undefined && child.key !== null) {
      keyToNewIndexMap.set(child.key, index)
    }
  }

  return { keyToNewIndexMap, newIndexToOldIndexMap, toBePatched }
}

function patchAlignedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  state: KeyedPatchState<HostNode, HostElement, HostFragment>,
  range: IndexRange,
  maps: IndexMaps,
): void {
  for (let index = range.oldStart; index <= range.oldEnd; index += 1) {
    const previousChild = state.previousChildren[index] as VirtualNode
    const newIndex =
      previousChild.key !== undefined && previousChild.key !== null
        ? maps.keyToNewIndexMap.get(previousChild.key)
        : findUnkeyedMatch(previousChild, state.nextChildren, range.newStart, range.newEnd)

    if (newIndex === undefined) {
      unmount(state.options, previousChild)
    } else {
      maps.newIndexToOldIndexMap[newIndex - range.newStart] = index + 1
      const childEnvironment = createChildEnvironment(
        state.environment,
        newIndex,
        state.nextChildren.length,
      )

      state.environment.patchChild(
        state.options,
        previousChild,
        state.nextChildren[newIndex] as VirtualNode,
        childEnvironment,
      )
    }
  }
}

function moveOrMountChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  state: KeyedPatchState<HostNode, HostElement, HostFragment>,
  range: IndexRange,
  maps: IndexMaps,
): void {
  for (let index = maps.toBePatched - 1; index >= 0; index -= 1) {
    const newIndex = range.newStart + index
    const nextChild = state.nextChildren[newIndex] as VirtualNode
    const anchorNode = findNextAnchor(state.nextChildren, newIndex + 1, state.environment.anchor)

    if (maps.newIndexToOldIndexMap[index] === 0) {
      const childEnvironment = createChildEnvironment(
        state.environment,
        newIndex,
        state.nextChildren.length,
      )
      const mounted = mountChild(
        state.options,
        nextChild,
        state.environment.container,
        childEnvironment.context,
      )

      if (mounted && anchorNode) {
        moveNodes(state.options, mounted.nodes, state.environment.container, anchorNode)
      }
    } else {
      const previousIndex = maps.newIndexToOldIndexMap[index] - 1
      const runtime = asRuntimeVNode<HostNode, HostElement, HostFragment>(
        state.previousChildren[previousIndex] as VirtualNode,
      )
      const nodes = runtime.handle?.nodes ?? []

      for (const node of nodes) {
        state.options.insertBefore(state.environment.container, node, anchorNode)
      }
    }
  }
}

function createIndexRange(previousLength: number, nextLength: number): IndexRange {
  return {
    oldStart: 0,
    newStart: 0,
    oldEnd: previousLength - 1,
    newEnd: nextLength - 1,
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
