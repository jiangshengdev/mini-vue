/**
 * 渲染输出归一化：
 * 将 `render` 返回的多形态输出规整为 `runtime-core` 可稳定消费的 `virtualNode` 结构。
 *
 * @remarks
 * - 数组输出会包裹为 `Fragment`，统一走 `children` 逻辑。
 * - 文本（`string`/`number`）会转换为 `Text` `virtualNode`，避免 `mount`/`patch` 出现分叉实现。
 * - 归一化后的 `children` 始终是 `virtualNode` 数组，便于 `patchChildren` 只处理一种形态。
 */
import type {
  ComponentChildren,
  ElementType,
  FragmentProps,
  RenderOutput,
  VirtualNode,
} from '@/jsx-foundation/index.ts'
import {
  createTextVirtualNode,
  createVirtualNode,
  Fragment,
  isVirtualNode,
} from '@/jsx-foundation/index.ts'
import { isNil } from '@/shared/index.ts'

/** 归一化后的 `virtualNode`：`children` 已转为 `virtualNode` 数组（文本已转换为 `Text` `virtualNode`）。 */
export interface NormalizedVirtualNode<T extends ElementType = ElementType> extends VirtualNode<T> {
  /** 归一化后的子节点列表，仅包含 `virtualNode`（文本已转换为 `Text` `virtualNode`）。 */
  children: NormalizedVirtualNode[]
}

/** `Patch` 阶段可假定的 `children` 形态：仅包含已归一化的 `virtualNode`。 */
export type NormalizedChildren = NormalizedVirtualNode[]

/** 组件 `render` 归一化后的输出形态：要么 `virtualNode`，要么空（`undefined`）。 */
export type NormalizedRenderOutput = NormalizedVirtualNode | undefined

/**
 * 将 `render` 返回的结果规整为 `runtime-core` 可消费的 `VirtualNode`。
 *
 * @remarks
 * 支持的输入类型：
 * - `null`/`undefined`/布尔值：归一为 `undefined`，不产生渲染输出。
 * - 数组：包裹为 `Fragment`，交由后续 `children` 归一化处理。
 * - `VirtualNode`：递归规整内部 `children`。
 * - 原始文本（`string`/`number`）：转为 `Text` `VirtualNode`。
 */
export function normalizeRenderOutput(output: RenderOutput): NormalizedRenderOutput {
  /* 空值与布尔值不会产生任何渲染输出，直接归一为空。 */
  if (isNil(output) || typeof output === 'boolean') {
    return undefined
  }

  /* 数组输出包裹为 Fragment，交由后续 children 归一化处理。 */
  if (Array.isArray(output)) {
    const fragmentVirtualNode = createVirtualNode({
      type: Fragment,
      rawProps: {
        children: output as ComponentChildren,
      } satisfies FragmentProps,
    })

    return normalizeVirtualNodeForRuntime(fragmentVirtualNode)
  }

  /* 已是 VirtualNode 时递归规整内部 children，保持形态一致。 */
  if (isVirtualNode(output)) {
    return normalizeVirtualNodeForRuntime(output)
  }

  /* 原始文本输出转为 Text VirtualNode，便于统一渲染路径。 */
  if (typeof output === 'string' || typeof output === 'number') {
    return normalizeVirtualNodeForRuntime(createTextVirtualNode(output))
  }

  return undefined
}

/**
 * 深度规整 `VirtualNode`，确保 `children` 形态与 runtime 预期一致。
 *
 * @remarks
 * - 递归归一化子节点，统一 `VirtualNode` 与文本节点的表达方式。
 * - 文本子节点转为 `Text` `VirtualNode`，便于 `diff` 与挂载复用同一路径。
 */
function normalizeVirtualNodeForRuntime(virtualNode: VirtualNode): NormalizedVirtualNode {
  /* 递归归一化子节点，统一 VirtualNode 与文本节点的表达方式。 */
  const children: NormalizedChildren = []

  for (const child of virtualNode.children) {
    if (isVirtualNode(child)) {
      children.push(normalizeVirtualNodeForRuntime(child))
      continue
    }

    /* 文本子节点转为 Text VirtualNode，便于 diff 与挂载复用同一路径。 */
    if (typeof child === 'string' || typeof child === 'number') {
      children.push(normalizeVirtualNodeForRuntime(createTextVirtualNode(child)))
    }
  }

  return {
    ...virtualNode,
    children,
  }
}
