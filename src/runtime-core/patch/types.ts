import type { NormalizedChildren, NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenEnvironment } from './children-environment.ts'
import type { PatchDriver } from './driver.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { Fragment, Text } from '@/jsx-foundation/index.ts'

/** 具名的文本 `virtualNode` 形态，方便在 patch 流程中窄化。 */
export type NormalizedTextVirtualNode = NormalizedVirtualNode<typeof Text>

/** 判断当前 `virtualNode` 是否为文本节点。 */
export function isTextVirtualNode(
  virtualNode: NormalizedVirtualNode,
): virtualNode is NormalizedTextVirtualNode {
  return virtualNode.type === Text
}

/** 具名的组件 `virtualNode` 形态，方便在 `patch` 时区分函数组件。 */
export type NormalizedComponentVirtualNode = NormalizedVirtualNode<SetupComponent>

/** 判断当前 `virtualNode` 是否为组件节点（已排除 `Fragment`/`Text`）。 */
export function isComponentVirtualNode(
  virtualNode: NormalizedVirtualNode,
): virtualNode is NormalizedComponentVirtualNode {
  return typeof virtualNode.type === 'function' && virtualNode.type !== Fragment
}

/** 两组 `children` 的有效 `diff` 区间：通过头尾同步逐步收缩到「需要真正对比」的中间段。 */
export interface IndexRange {
  /** 旧 children 的起始索引（含）。 */
  oldStart: number
  /** 新 children 的起始索引（含）。 */
  newStart: number
  /** 旧 children 的结束索引（含）。 */
  oldEnd: number
  /** 新 children 的结束索引（含）。 */
  newEnd: number
}

/** `keyed diff` 过程中的只读输入集合，避免函数间传参过长。 */
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
 * - `newIndexToOldIndexMap` 记录新索引对应的旧索引（`+1` 编码），`0` 代表需要 `mount`。
 */
export interface IndexMaps {
  /** `key` -> newIndex 的映射，仅收集有效 key。 */
  readonly keyToNewIndexMap: Map<PropertyKey, number>
  /** `newIndex` 对应的 oldIndex（+1），用于区分「可复用」与「需要新建」。 */
  readonly newIndexToOldIndexMap: number[]
  /** 中间段待处理的新节点数量。 */
  readonly middleSegmentCount: number
}

/** `patch` 执行结果：用于向上游报告成功状态、移动与锚点使用情况。 */
export interface PatchResult<HostNode = unknown> {
  /** 子树是否成功（`ok` 概念沿用 `MountedHandle`）。 */
  ok?: boolean
  /** 是否发生过移动（用于调试/统计）。 */
  moved?: boolean
  /** 实际使用过的锚点（若有）。 */
  usedAnchor?: HostNode
}
