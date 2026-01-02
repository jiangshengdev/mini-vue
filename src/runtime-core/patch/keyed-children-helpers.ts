/**
 * `keyed diff` 的辅助函数集合：维护索引区间、索引映射与锚点解析。
 */
import type { NormalizedChildren, NormalizedVirtualNode } from '../normalize.ts'
import { createChildEnvironment } from './children-environment.ts'
import type { IndexMaps, IndexRange, KeyedPatchContext } from './types.ts'
import { findNextAnchor, isSameVirtualNode } from './utils.ts'

/**
 * 初始化 `diff` 区间，后续会被头尾同步逻辑收缩。
 *
 * @remarks
 * 区间表示「需要真正对比」的中间段，头尾同步会逐步收缩这个区间。
 *
 * @param previousLength - 旧列表长度
 * @param nextLength - 新列表长度
 * @returns 初始化的对比区间
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
 *
 * @remarks
 * - 头部同步可以快速消耗列表前缀的相同节点，减少后续 `keyed` 匹配的工作量。
 * - 同步完成后 `range.oldStart`/`range.newStart` 指向第一个不同的节点。
 *
 * @param context - `keyed diff` 上下文
 * @param range - 仍需处理的索引区间
 */
export function syncFromStart<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(context: KeyedPatchContext<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  while (
    range.oldStart <= range.oldEnd &&
    range.newStart <= range.newEnd &&
    isSameVirtualNode(
      context.previousChildren[range.oldStart],
      context.nextChildren[range.newStart],
    )
  ) {
    const childEnvironment = createChildEnvironment(context.environment)

    context.environment.patchChild(
      context.options,
      context.previousChildren[range.oldStart],
      context.nextChildren[range.newStart],
      childEnvironment,
    )
    /* 头部已对齐，继续向中间推进。 */
    range.oldStart += 1
    range.newStart += 1
  }
}

/**
 * 从尾部同步：只要两侧节点相同就持续 `patch` 并收缩区间终点。
 *
 * @remarks
 * - 尾部同步可以快速消耗列表后缀的相同节点，减少后续 `keyed` 匹配的工作量。
 * - 同步完成后 `range.oldEnd`/`range.newEnd` 指向最后一个不同的节点。
 *
 * @param context - `keyed diff` 上下文
 * @param range - 仍需处理的索引区间
 */
export function syncFromEnd<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(context: KeyedPatchContext<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  while (
    range.oldStart <= range.oldEnd &&
    range.newStart <= range.newEnd &&
    isSameVirtualNode(context.previousChildren[range.oldEnd], context.nextChildren[range.newEnd])
  ) {
    const childEnvironment = createChildEnvironment(context.environment)

    context.environment.patchChild(
      context.options,
      context.previousChildren[range.oldEnd],
      context.nextChildren[range.newEnd],
      childEnvironment,
    )
    /* 尾部已对齐，继续向中间收缩。 */
    range.oldEnd -= 1
    range.newEnd -= 1
  }
}

/**
 * 旧列表已耗尽：将新列表剩余段依次 `mount`，并整体插入到同一个锚点之前。
 *
 * @remarks
 * - 旧侧已耗尽时，剩余新节点应整体插入到「尾部已对齐区间」的前面。
 * - 使用同一个 `insertAnchor` 可避免 `mountChild` 对插入位置的不同宿主实现差异。
 *
 * @param context - `keyed diff` 上下文
 * @param range - 仍需处理的索引区间
 */
export function insertRemainingChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(context: KeyedPatchContext<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  const insertAnchor = findNextAnchor(
    context.nextChildren,
    range.newEnd + 1,
    context.environment.anchor,
  )

  /*
   * 这里使用同一个 `insertAnchor`：
   * - 旧侧已耗尽时，剩余新节点应整体插入到「尾部已对齐区间」的前面。
   * - 逐个 `mount` 后再 `move`，可避免 `mountChild` 对插入位置的不同宿主实现差异。
   */
  for (let index = range.newStart; index <= range.newEnd; index += 1) {
    const childEnvironment = createChildEnvironment(context.environment)

    context.driver.mountNew(context.nextChildren[index], {
      anchor: insertAnchor,
      context: childEnvironment.context,
    })
  }
}

/**
 * 新列表已耗尽：卸载旧列表剩余段。
 *
 * @param context - `keyed diff` 上下文
 * @param range - 仍需处理的索引区间
 */
export function removeRemainingChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(context: KeyedPatchContext<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  for (let index = range.oldStart; index <= range.oldEnd; index += 1) {
    context.driver.unmountOnly(context.previousChildren[index])
  }
}

/**
 * 为 `keyed diff` 的中间段建立索引映射结构。
 *
 * @remarks
 * - `keyToNewIndexMap`：`key` -> `newIndex` 的映射，便于旧节点通过 `key` 快速命中。
 * - `newIndexToOldIndexMap`：`newIndex` -> `oldIndex` 的映射，`-1` 表示需要 `mount`。
 * - `middleSegmentCount`：中间段待处理的新节点数量。
 *
 * @param context - `keyed diff` 上下文
 * @param range - 仍需处理的索引区间
 * @returns 包含双向映射的索引结构
 */
export function buildIndexMaps<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(context: KeyedPatchContext<HostNode, HostElement, HostFragment>, range: IndexRange): IndexMaps {
  const keyToNewIndexMap = new Map<PropertyKey, number>()
  const middleSegmentCount = range.newEnd - range.newStart + 1
  /* 使用 -1 作为「没有可复用旧节点」的哨兵值，旧索引可直接存储无需偏移。 */
  const newIndexToOldIndexMap = Array.from({ length: middleSegmentCount }, () => {
    return -1
  })

  /* 先收集新列表中间段的 `key` 映射，便于旧节点通过 `key` 快速命中。 */
  for (let index = range.newStart; index <= range.newEnd; index += 1) {
    const child = context.nextChildren[index]

    if (child.key !== undefined && child.key !== null) {
      keyToNewIndexMap.set(child.key, index)
    }
  }

  return { keyToNewIndexMap, newIndexToOldIndexMap, middleSegmentCount }
}

/**
 * 在指定区间内寻找「无 `key` 且同类型」的可复用节点。
 *
 * @remarks
 * 这是 `keyed diff` 的兜底分支：当旧节点没有 `key` 时，允许通过类型匹配复用新列表中的无 `key` 节点。
 *
 * @param target - 旧列表中无 `key` 的节点
 * @param list - 新子节点列表
 * @param context - 搜索范围与映射上下文
 * @returns 命中的新索引或 `undefined`
 */
export function findUnkeyedMatch(
  target: NormalizedVirtualNode,
  list: NormalizedChildren,
  context: {
    start: number
    end: number
    maps: IndexMaps
    range: IndexRange
  },
): number | undefined {
  for (let index = context.start; index <= context.end; index += 1) {
    const candidate = list[index]
    const mapped = context.maps.newIndexToOldIndexMap[index - context.range.newStart]

    if (
      (candidate.key === null || candidate.key === undefined) &&
      mapped === -1 &&
      isSameVirtualNode(candidate, target)
    ) {
      return index
    }
  }

  return undefined
}
