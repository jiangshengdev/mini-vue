import type { MountContext } from '../mount/context.ts'
import { mountChild } from '../mount/index.ts'
import type { NormalizedChildren, NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { ContainerLike, PatchContext } from './context.ts'
import { normalizeChildContext } from './context.ts'
import { getHostNodes } from './runtime-vnode.ts'
import { findNextAnchor, hasKeys, isSameVirtualNode, moveNodes, unmount } from './utils.ts'

/**
 * 子节点 patch 回调签名：由 patchChildren 调用，用于复用单节点的 mount/patch/unmount 逻辑。
 */
type PatchChildFunction<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> = (
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: NormalizedVirtualNode | undefined,
  next: NormalizedVirtualNode | undefined,
  environment: PatchEnvironment<HostNode, HostElement, HostFragment>,
) => void

/**
 * 单个子节点 patch 所需的环境信息。
 */
interface BasePatchEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  /** 子节点将被插入的宿主容器（元素或片段）。 */
  container: ContainerLike<HostNode, HostElement, HostFragment>
  /** 插入锚点：用于将新挂载/移动的节点放到正确位置。 */
  anchor?: HostNode
  /** 父组件与 appContext 等上下文，向下透传到 mount/patch。 */
  context?: PatchContext | MountContext
}

/**
 * 单个子节点 patch 所需的环境信息。
 */
export type PatchEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> = BasePatchEnvironment<HostNode, HostElement, HostFragment>

/**
 * `patchChildren` 的调用环境：在 PatchEnvironment 基础上追加 patchChild 回调。
 */
interface PatchChildrenContext<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> extends PatchEnvironment<HostNode, HostElement, HostFragment> {
  /** 单节点 patch 实现（由调用方提供，常见为 patchChild）。 */
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>
}

/**
 * 两组 children 的有效 diff 区间：通过头尾同步逐步收缩到“需要真正对比”的中间段。
 */
interface IndexRange {
  /** 旧 children 的起始索引（含）。 */
  oldStart: number
  /** 新 children 的起始索引（含）。 */
  newStart: number
  /** 旧 children 的结束索引（含）。 */
  oldEnd: number
  /** 新 children 的结束索引（含）。 */
  newEnd: number
}

/**
 * Keyed diff 过程中的只读输入集合，避免函数间传参过长。
 */
interface KeyedPatchState<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  /** 渲染器宿主原语集合。 */
  readonly options: RendererOptions<HostNode, HostElement, HostFragment>
  /** 旧 children 列表。 */
  readonly previousChildren: NormalizedChildren
  /** 新 children 列表。 */
  readonly nextChildren: NormalizedChildren
  /** 容器/锚点/上下文，以及单节点 patch 回调。 */
  readonly environment: PatchChildrenContext<HostNode, HostElement, HostFragment>
}

/**
 * Keyed diff 的辅助索引结构：
 * - keyToNewIndexMap 用于 O(1) 找到 key 在新列表的位置。
 * - newIndexToOldIndexMap 记录新索引对应的旧索引（+1 编码），0 代表需要 mount。
 */
interface IndexMaps {
  /** `key` -> newIndex 的映射，仅收集有效 key。 */
  readonly keyToNewIndexMap: Map<PropertyKey, number>
  /** `newIndex` 对应的 oldIndex（+1），用于区分“可复用”与“需要新建”。 */
  readonly newIndexToOldIndexMap: number[]
  /** 中间段待处理的新节点数量。 */
  readonly toBePatched: number
}

/**
 * 基于父环境为当前子节点派生环境：
 * - 通过 normalizeChildContext 计算 shouldUseAnchor，用于同级批量插入的锚点策略。
 */
function createChildEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
  index: number,
  length: number,
): PatchEnvironment<HostNode, HostElement, HostFragment> & {
  context: ReturnType<typeof normalizeChildContext>
} {
  return {
    container: environment.container,
    anchor: environment.anchor,
    context: normalizeChildContext(environment.context, index, length),
  }
}

/**
 * `patch` 一组 children：
 * - 若存在 key（任一侧有 key），走 keyed diff 以支持移动与复用。
 * - 否则按索引对齐的 unkeyed diff，逻辑更简单。
 */
export function patchChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: NormalizedChildren,
  nextChildren: NormalizedChildren,
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
): void {
  /*
   * 只要任一侧出现 key，就必须走 keyed diff：
   * - keyed diff 允许跨索引复用与移动。
   * - unkeyed diff 只按索引对齐，不支持“同节点换位置”的语义。
   */
  const isKeyed = hasKeys(nextChildren) || hasKeys(previousChildren)

  if (isKeyed) {
    patchKeyedChildren(options, previousChildren, nextChildren, environment)

    return
  }

  patchUnkeyedChildren(options, previousChildren, nextChildren, environment)
}

/**
 * Unkeyed children diff：
 * - 先按索引 patch 公共长度。
 * - 新列表更长则追加 mount，并按“后继节点”计算插入锚点。
 * - 旧列表更长则卸载多余节点。
 */
function patchUnkeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: NormalizedChildren,
  nextChildren: NormalizedChildren,
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
): void {
  const commonLength = Math.min(previousChildren.length, nextChildren.length)

  /* 公共部分逐个 patch：unkeyed 场景下“同索引”即认为是同位置节点。 */
  for (let index = 0; index < commonLength; index += 1) {
    /* 使用 nextChildren.length 计算 shouldUseAnchor：只有不是最后一个兄弟时才需要锚点插入策略。 */
    const childEnvironment = createChildEnvironment(environment, index, nextChildren.length)

    environment.patchChild(options, previousChildren[index], nextChildren[index], childEnvironment)
  }

  if (nextChildren.length > previousChildren.length) {
    /* 新增节点：逐个 mount，并使用“下一个已存在节点”作为插入锚点。 */
    for (let index = commonLength; index < nextChildren.length; index += 1) {
      const next = nextChildren[index]
      /*
       * 追加 mount 时需要一个“后继锚点”：
       * - 若后面还有已 mount 的节点，则插到它前面。
       * - 否则回退到父级 anchor（可能为空，交由宿主实现决定默认插入位置）。
       */
      const nextAnchor = findNextAnchor(nextChildren, index + 1, environment.anchor)
      const childEnvironment = createChildEnvironment(environment, index, nextChildren.length)
      const mounted = mountChild(options, next, environment.container, childEnvironment.context)

      if (mounted && nextAnchor) {
        moveNodes(options, mounted.nodes, environment.container, nextAnchor)
      }
    }
  } else if (previousChildren.length > nextChildren.length) {
    /* 移除节点：卸载旧列表超出部分。 */
    for (let index = commonLength; index < previousChildren.length; index += 1) {
      unmount(options, previousChildren[index])
    }
  }
}

/**
 * Keyed children diff：支持基于 key 的复用与移动。
 *
 * @remarks
 * 算法步骤：
 * 1) 头尾同步：尽可能从两端消耗相同节点，缩小中间 diff 范围。
 * 2) 处理纯新增/纯删除的剩余段。
 * 3) 为中间段建立索引映射并 patch 可复用节点。
 * 4) 倒序遍历新列表中间段：mount 新节点或将旧节点移动到正确位置。
 */
function patchKeyedChildren<
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

  /* 先从头尾尽量消费相同节点：这能减少后续 keyed 匹配与移动的工作量。 */
  syncFromStart(state, range)
  syncFromEnd(state, range)

  /* 头尾同步后若旧侧已耗尽，剩余只可能是新增：直接批量 mount。 */
  if (range.oldStart > range.oldEnd) {
    insertRemainingChildren(state, range)

    return
  }

  /* 头尾同步后若新侧已耗尽，剩余只可能是删除：直接批量卸载。 */
  if (range.newStart > range.newEnd) {
    removeRemainingChildren(state, range)

    return
  }

  /* 为中间段建立 key -> newIndex 与 newIndex -> oldIndex 的双向辅助结构。 */
  const maps = buildIndexMaps(state, range)

  /* 先遍历旧中间段做复用/卸载，并填充 newIndexToOldIndexMap。 */
  patchAlignedChildren(state, range, maps)
  /* 再倒序遍历新中间段，将节点 mount/移动到正确位置。 */
  moveOrMountChildren(state, range, maps)
}

/**
 * 从头部同步：只要两侧节点相同就持续 patch 并推进区间起点。
 */
function syncFromStart<
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
 * 从尾部同步：只要两侧节点相同就持续 patch 并收缩区间终点。
 */
function syncFromEnd<
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
 * 旧列表已耗尽：将新列表剩余段依次 mount，并整体插入到同一个锚点之前。
 */
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

  /*
   * 这里使用同一个 insertAnchor：
   * - 旧侧已耗尽时，剩余新节点应整体插入到“尾部已对齐区间”的前面。
   * - 逐个 mount 后再 move，可避免 mountChild 对插入位置的不同宿主实现差异。
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
function removeRemainingChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): void {
  for (let index = range.oldStart; index <= range.oldEnd; index += 1) {
    unmount(state.options, state.previousChildren[index])
  }
}

/**
 * 为 keyed diff 的中间段建立索引映射结构。
 */
function buildIndexMaps<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(state: KeyedPatchState<HostNode, HostElement, HostFragment>, range: IndexRange): IndexMaps {
  const keyToNewIndexMap = new Map<PropertyKey, number>()
  const toBePatched = range.newEnd - range.newStart + 1
  /* 使用 0 作为“没有可复用旧节点”的哨兵值，因此旧索引在写入时会 +1 编码。 */
  const newIndexToOldIndexMap = Array.from({ length: toBePatched }, () => {
    return 0
  })

  /* 先收集新列表中间段的 key 映射，便于旧节点通过 key 快速命中。 */
  for (let index = range.newStart; index <= range.newEnd; index += 1) {
    const child = state.nextChildren[index]

    if (child.key !== undefined && child.key !== null) {
      keyToNewIndexMap.set(child.key, index)
    }
  }

  return { keyToNewIndexMap, newIndexToOldIndexMap, toBePatched }
}

/**
 * 遍历旧列表的中间段：
 * - 找不到对应新节点则卸载。
 * - 找到则 patch，并记录“新索引 -> 旧索引”的复用映射。
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
    /* 有 key 则优先通过映射定位，否则尝试在新列表中间段线性寻找可复用的无 key 节点。 */
    const newIndex =
      previousChild.key !== undefined && previousChild.key !== null
        ? maps.keyToNewIndexMap.get(previousChild.key)
        : findUnkeyedMatch(previousChild, state.nextChildren, range.newStart, range.newEnd)

    if (newIndex === undefined) {
      /* 旧节点在新列表中不存在：直接卸载，避免后续移动阶段误处理。 */
      unmount(state.options, previousChild)
    } else {
      /* 记录新索引对应的旧索引（+1 编码），供后续倒序移动/挂载阶段判断是否需要 mount。 */
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
 * 倒序遍历可以让每个节点都以“其后继节点”作为锚点插入，避免在同一轮移动中锚点失效。
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
      /* 该新节点没有对应旧节点：执行 mount 并插入到 anchorNode 之前。 */
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
      /* 该新节点可复用旧节点：直接把旧节点的宿主 nodes 移动到 anchorNode 之前。 */
      const previousIndex = maps.newIndexToOldIndexMap[index] - 1
      const nodes = getHostNodes<HostNode, HostElement, HostFragment>(
        state.previousChildren[previousIndex],
      )

      /*
       * 直接移动宿主节点而不是重新 patch：
       * - patchAlignedChildren 已完成复用节点的内容更新。
       * - 这里仅负责把“已更新的旧节点”放到正确位置。
       */
      for (const node of nodes) {
        state.options.insertBefore(state.environment.container, node, anchorNode)
      }
    }
  }
}

/**
 * 初始化 diff 区间，后续会被头尾同步逻辑收缩。
 */
function createIndexRange(previousLength: number, nextLength: number): IndexRange {
  return {
    oldStart: 0,
    newStart: 0,
    oldEnd: previousLength - 1,
    newEnd: nextLength - 1,
  }
}

/**
 * 在指定区间内寻找“无 key 且同类型”的可复用节点。
 *
 * @remarks
 * 这是 keyed diff 的兜底分支：当旧节点没有 key 时，允许通过类型匹配复用新列表中的无 key 节点。
 */
function findUnkeyedMatch(
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
