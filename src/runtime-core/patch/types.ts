/**
 * patch 子域的类型与类型守卫定义，方便在 diff 过程中收窄节点形态。
 */
import type { NormalizedChildren, NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenEnvironment } from './children-environment.ts'
import type { PatchDriver } from './driver.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { Comment, Fragment, Text } from '@/jsx-foundation/index.ts'

/**
 * 具名的文本 `virtualNode` 形态，方便在 `patch` 流程中窄化类型。
 *
 * @remarks
 * `Text` 节点在 `diff` 中只要都是 `Text` 且 `key` 相同即可复用宿主节点。
 */
export type NormalizedTextVirtualNode = NormalizedVirtualNode<typeof Text>

/**
 * 判断当前 `virtualNode` 是否为文本节点。
 *
 * @remarks
 * 用于 `patch` 流程中区分文本节点与其他节点类型。
 */
export function isTextVirtualNode(
  virtualNode: NormalizedVirtualNode,
): virtualNode is NormalizedTextVirtualNode {
  return virtualNode.type === Text
}

/**
 * 具名的注释 `virtualNode` 形态，方便在 `patch` 流程中窄化类型。
 *
 * @remarks
 * `Comment` 节点在 `diff` 中用于空渲染占位，通常可复用旧宿主节点并按需更新内容。
 */
export type NormalizedCommentVirtualNode = NormalizedVirtualNode<typeof Comment>

/**
 * 判断当前 `virtualNode` 是否为注释节点。
 */
export function isCommentVirtualNode(
  virtualNode: NormalizedVirtualNode,
): virtualNode is NormalizedCommentVirtualNode {
  return virtualNode.type === Comment
}

/**
 * 具名的组件 `virtualNode` 形态，方便在 `patch` 时区分函数组件。
 *
 * @remarks
 * 组件 `virtualNode` 的 `type` 是函数，但需排除 `Fragment`（它也是函数但不是组件）。
 */
export type NormalizedComponentVirtualNode = NormalizedVirtualNode<SetupComponent>

/**
 * 判断当前 `virtualNode` 是否为组件节点（已排除 `Fragment`/`Text`）。
 *
 * @remarks
 * 用于 `patch` 流程中区分组件节点与元素节点。
 */
export function isComponentVirtualNode(
  virtualNode: NormalizedVirtualNode,
): virtualNode is NormalizedComponentVirtualNode {
  return typeof virtualNode.type === 'function' && virtualNode.type !== Fragment
}

/**
 * 两组 `children` 的有效 `diff` 区间：通过头尾同步逐步收缩到「需要真正对比」的中间段。
 *
 * @remarks
 * - 头尾同步会消耗列表前后缀的相同节点，减少后续 `keyed` 匹配的工作量。
 * - 区间为闭区间，`oldStart <= oldEnd` 且 `newStart <= newEnd` 时表示仍有待处理节点。
 */
export interface IndexRange {
  /** 旧 `children` 的起始索引（含）。 */
  oldStart: number
  /** 新 `children` 的起始索引（含）。 */
  newStart: number
  /** 旧 `children` 的结束索引（含）。 */
  oldEnd: number
  /** 新 `children` 的结束索引（含）。 */
  newEnd: number
}

/**
 * `keyed diff` 过程中的只读输入集合，避免函数间传参过长。
 *
 * @remarks
 * 将 `options`/`previousChildren`/`nextChildren`/`environment`/`driver` 打包为一个上下文对象，
 * 便于在 `keyed diff` 的各个辅助函数间传递。
 */
export interface KeyedPatchContext<
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
  /** 容器/锚点/上下文，以及单节点 `patch` 回调。 */
  readonly environment: PatchChildrenEnvironment<HostNode, HostElement, HostFragment>
  /** 统一的宿主操作驱动，封装新增/替换/卸载/移动。 */
  readonly driver: PatchDriver<HostNode, HostElement, HostFragment>
}

/**
 * `keyed diff` 的辅助索引结构：
 * - `keyToNewIndexMap` 用于 O(1) 找到 `key` 在新列表的位置。
 * - `newIndexToOldIndexMap` 记录新索引对应的旧索引，`-1` 代表需要 `mount`。
 *
 * @remarks
 * 这些映射在 `buildIndexMaps` 中构建，供后续 `patchAlignedChildren` 和 `moveOrMountChildren` 使用。
 */
export interface IndexMaps {
  /** `key` -> `newIndex` 的映射，仅收集有效 `key`（非 `null`/`undefined`）。 */
  readonly keyToNewIndexMap: Map<PropertyKey, number>
  /** `newIndex` 对应的 `oldIndex`，`-1` 为未复用哨兵。 */
  readonly newIndexToOldIndexMap: number[]
  /** 中间段待处理的新节点数量。 */
  readonly middleSegmentCount: number
}

/**
 * `patch` 执行结果：用于向上游报告成功状态、移动与锚点使用情况。
 *
 * @remarks
 * - `ok`：子树是否成功（沿用 `MountedHandle` 的语义）。
 * - `moved`：是否发生过移动（用于调试/统计）。
 * - `usedAnchor`：实际使用过的锚点（若有）。
 */
export interface PatchResult<HostNode = unknown> {
  /** 子树是否成功（`ok` 概念沿用 `MountedHandle`）。 */
  ok?: boolean
  /** 是否发生过移动（用于调试/统计）。 */
  moved?: boolean
  /** 实际使用过的锚点（若有）。 */
  usedAnchor?: HostNode
}
