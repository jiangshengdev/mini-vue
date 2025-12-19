import { mountChild } from '../mount/index.ts'
import type { NormalizedChildren } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenContext } from './children-environment.ts'
import { createChildEnvironment } from './children-environment.ts'
import {
  buildIndexMaps,
  createIndexRange,
  findUnkeyedMatch,
  insertRemainingChildren,
  removeRemainingChildren,
  syncFromEnd,
  syncFromStart,
} from './keyed-children-helpers.ts'
import { getHostNodes } from './runtime-vnode.ts'
import type { IndexMaps, IndexRange, KeyedPatchState } from './types.ts'
import { findNextAnchor, moveNodes, unmount } from './utils.ts'

/**
 * Keyed `children diff`：支持基于 `key` 的复用与移动。
 *
 * @remarks
 * 算法步骤：
 * 1) 头尾同步：尽可能从两端消耗相同节点，缩小中间 `diff` 范围。
 * 2) 处理纯新增/纯删除的剩余段。
 * 3) 为中间段建立索引映射并 `patch` 可复用节点。
 * 4) 倒序遍历新列表中间段：`mount` 新节点或将旧节点移动到正确位置。
 */
export function patchKeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: NormalizedChildren,
  nextChildren: NormalizedChildren,
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
): void {
  const state: KeyedPatchState<HostNode, HostElement, HostFragment> = {
    options,
    previousChildren,
    nextChildren,
    environment,
  }
  const range = createIndexRange(previousChildren.length, nextChildren.length)

  /* 先从头尾尽量消费相同节点：这能减少后续 `keyed` 匹配与移动的工作量。 */
  syncFromStart(state, range)
  syncFromEnd(state, range)

  /* 头尾同步后若旧侧已耗尽，剩余只可能是新增：直接批量 `mount`。 */
  if (range.oldStart > range.oldEnd) {
    insertRemainingChildren(state, range)

    return
  }

  /* 头尾同步后若新侧已耗尽，剩余只可能是删除：直接批量卸载。 */
  if (range.newStart > range.newEnd) {
    removeRemainingChildren(state, range)

    return
  }

  /* 为中间段建立 `key -> newIndex` 与 `newIndex -> oldIndex` 的双向辅助结构。 */
  const maps = buildIndexMaps(state, range)

  /* 先遍历旧中间段做复用/卸载，并填充 newIndexToOldIndexMap。 */
  patchAlignedChildren(state, range, maps)
  /* 再倒序遍历新中间段，将节点 mount/移动到正确位置。 */
  moveOrMountChildren(state, range, maps)
}

/**
 * 遍历旧列表的中间段：
 * - 找不到对应新节点则卸载。
 * - 找到则 `patch`，并记录「新索引 -> 旧索引」的复用映射。
 */
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
    const previousChild = state.previousChildren[index]
    /* 有 `key` 则优先通过映射定位，否则尝试在新列表中间段线性寻找可复用的无 `key` 节点。 */
    const newIndex =
      previousChild.key !== undefined && previousChild.key !== null
        ? maps.keyToNewIndexMap.get(previousChild.key)
        : findUnkeyedMatch(previousChild, state.nextChildren, range.newStart, range.newEnd)

    if (newIndex === undefined) {
      /* 旧节点在新列表中不存在：直接卸载，避免后续移动阶段误处理。 */
      unmount(state.options, previousChild)
    } else {
      /* 记录新索引对应的旧索引（`+1` 编码），供后续倒序移动/挂载阶段判断是否需要 `mount`。 */
      maps.newIndexToOldIndexMap[newIndex - range.newStart] = index + 1
      const childEnvironment = createChildEnvironment(
        state.environment,
        newIndex,
        state.nextChildren.length,
      )

      state.environment.patchChild(
        state.options,
        previousChild,
        state.nextChildren[newIndex],
        childEnvironment,
      )
    }
  }
}

/**
 * 将新列表中间段的节点移动/挂载到正确位置。
 *
 * @remarks
 * 倒序遍历可以让每个节点都以「其后继节点」作为锚点插入，避免在同一轮移动中锚点失效。
 */
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
    const nextChild = state.nextChildren[newIndex]
    const anchorNode = findNextAnchor(state.nextChildren, newIndex + 1, state.environment.anchor)

    if (maps.newIndexToOldIndexMap[index] === 0) {
      /* 该新节点没有对应旧节点：执行 `mount` 并插入到 `anchorNode` 之前。 */
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
      /* 该新节点可复用旧节点：直接把旧节点的宿主 `nodes` 移动到 `anchorNode` 之前。 */
      const previousIndex = maps.newIndexToOldIndexMap[index] - 1
      const nodes = getHostNodes<HostNode, HostElement, HostFragment>(
        state.previousChildren[previousIndex],
      )

      /*
       * 直接移动宿主节点而不是重新 patch：
       * - patchAlignedChildren 已完成复用节点的内容更新。
       * - 这里仅负责把「已更新的旧节点」放到正确位置。
       */
      for (const node of nodes) {
        state.options.insertBefore(state.environment.container, node, anchorNode)
      }
    }
  }
}
