import type { NormalizedChildren, NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenContext } from './children-environment.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { Fragment, Text } from '@/jsx-foundation/index.ts'

/** 具名的文本 `vnode` 形态，补充可选 `text` 字段以匹配运行时数据。 */
export type NormalizedTextVirtualNode = NormalizedVirtualNode<typeof Text> & { text?: string }

/** 判断当前 `vnode` 是否为文本节点。 */
export function isTextVirtualNode(
  vnode: NormalizedVirtualNode,
): vnode is NormalizedTextVirtualNode {
  return vnode.type === Text
}

/** 具名的组件 `vnode` 形态，方便在 `patch` 时区分函数组件。 */
export type NormalizedComponentVirtualNode = NormalizedVirtualNode<SetupComponent>

/** 判断当前 `vnode` 是否为组件节点（已排除 `Fragment`/`Text`）。 */
export function isComponentVirtualNode(
  vnode: NormalizedVirtualNode,
): vnode is NormalizedComponentVirtualNode {
  return typeof vnode.type === 'function' && vnode.type !== Fragment
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
export interface KeyedPatchState<
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
  readonly environment: PatchChildrenContext<HostNode, HostElement, HostFragment>
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
  readonly toBePatched: number
}
