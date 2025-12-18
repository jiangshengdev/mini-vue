import { mountChild } from '../mount/index.ts'
import type { NormalizedChildren, NormalizedVirtualNode } from '../normalize.ts'
import { createChildEnvironment } from './children-environment.ts'
import type { IndexMaps, IndexRange, KeyedPatchState } from './types.ts'
import { findNextAnchor, isSameVirtualNode, moveNodes, unmount } from './utils.ts'

/**
 * 初始化 `diff` 区间，后续会被头尾同步逻辑收缩。
 */
export function createIndexRange(previousLength: number, nextLength: number): IndexRange {
  return {
    oldStart: 0,
    newStart: 0,
    oldEnd: previousLength - 1,
    newEnd: nextLength - 1,
  }
}

/**
 * 从头部同步：只要两侧节点相同就持续 `patch` 并推进区间起点。
 */
export function syncFromStart<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  while (
    range.oldStart <= range.oldEnd &&
    range.newStart <= range.newEnd &&
    isSameVirtualNode(state.previousChildren[range.oldStart], state.nextChildren[range.newStart])
  ) {
    const childEnvironment = createChildEnvironment(
      state.environment,
      range.newStart,
      state.nextChildren.length,
    )

    state.environment.patchChild(
      state.options,
      state.previousChildren[range.oldStart],
      state.nextChildren[range.newStart],
      childEnvironment,
    )
    /* 头部已对齐，继续向中间推进。 */
    range.oldStart += 1
    range.newStart += 1
  }
}

/**
 * 从尾部同步：只要两侧节点相同就持续 `patch` 并收缩区间终点。
 */
export function syncFromEnd<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  while (
    range.oldStart <= range.oldEnd &&
    range.newStart <= range.newEnd &&
    isSameVirtualNode(state.previousChildren[range.oldEnd], state.nextChildren[range.newEnd])
  ) {
    const childEnvironment = createChildEnvironment(
      state.environment,
      range.newEnd,
      state.nextChildren.length,
    )

    state.environment.patchChild(
      state.options,
      state.previousChildren[range.oldEnd],
      state.nextChildren[range.newEnd],
      childEnvironment,
    )
    /* 尾部已对齐，继续向中间收缩。 */
    range.oldEnd -= 1
    range.newEnd -= 1
  }
}

/**
 * 旧列表已耗尽：将新列表剩余段依次 `mount`，并整体插入到同一个锚点之前。
 */
export function insertRemainingChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  const insertAnchor = findNextAnchor(
    state.nextChildren,
    range.newEnd + 1,
    state.environment.anchor,
  )

  /*
   * 这里使用同一个 `insertAnchor`：
   * - 旧侧已耗尽时，剩余新节点应整体插入到“尾部已对齐区间”的前面。
   * - 逐个 `mount` 后再 `move`，可避免 `mountChild` 对插入位置的不同宿主实现差异。
   */
  for (let index = range.newStart; index <= range.newEnd; index += 1) {
    const childEnvironment = createChildEnvironment(
      state.environment,
      index,
      state.nextChildren.length,
    )
    const mounted = mountChild(
      state.options,
      state.nextChildren[index],
      state.environment.container,
      childEnvironment.context,
    )

    if (mounted && insertAnchor) {
      moveNodes(state.options, mounted.nodes, state.environment.container, insertAnchor)
    }
  }
}

/**
 * 新列表已耗尽：卸载旧列表剩余段。
 */
export function removeRemainingChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  for (let index = range.oldStart; index <= range.oldEnd; index += 1) {
    unmount(state.options, state.previousChildren[index])
  }
}

/**
 * 为 `keyed diff` 的中间段建立索引映射结构。
 */
export function buildIndexMaps<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): IndexMaps {
  const keyToNewIndexMap = new Map<PropertyKey, number>()
  const toBePatched = range.newEnd - range.newStart + 1
  /* 使用 0 作为“没有可复用旧节点”的哨兵值，因此旧索引在写入时会 `+1` 编码。 */
  const newIndexToOldIndexMap = Array.from({ length: toBePatched }, () => {
    return 0
  })

  /* 先收集新列表中间段的 `key` 映射，便于旧节点通过 `key` 快速命中。 */
  for (let index = range.newStart; index <= range.newEnd; index += 1) {
    const child = state.nextChildren[index]

    if (child.key !== undefined && child.key !== null) {
      keyToNewIndexMap.set(child.key, index)
    }
  }

  return { keyToNewIndexMap, newIndexToOldIndexMap, toBePatched }
}

/**
 * 在指定区间内寻找“无 `key` 且同类型”的可复用节点。
 *
 * @remarks
 * 这是 `keyed diff` 的兜底分支：当旧节点没有 `key` 时，允许通过类型匹配复用新列表中的无 `key` 节点。
 */
export function findUnkeyedMatch(
  target: NormalizedVirtualNode,
  list: NormalizedChildren,
  start: number,
  end: number,
): number | undefined {
  for (let index = start; index <= end; index += 1) {
    const candidate = list[index]

    if (
      (candidate.key === null || candidate.key === undefined) &&
      isSameVirtualNode(candidate, target)
    ) {
      return index
    }
  }

  return undefined
}
