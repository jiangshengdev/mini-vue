/**
 * 渲染输出归一化：
 * 将 `render` 返回的多形态输出规整为 `runtime-core` 可稳定消费的 `vnode` 结构。
 *
 * @remarks
 * - 数组输出会包裹为 `Fragment`，统一走 `children` 逻辑。
 * - 文本（`string`/`number`）会转换为 `Text` `vnode`，避免 `mount`/`patch` 出现分叉实现。
 * - 归一化后的 `children` 始终是 `vnode` 数组，便于 `patchChildren` 只处理一种形态。
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

/** 归一化后的 virtualNode：children 已转为 vnode 数组（文本已转换为 Text vnode）。 */
export interface NormalizedVirtualNode<T extends ElementType = ElementType> extends VirtualNode<T> {
  children: NormalizedVirtualNode[]
}

/** Patch 阶段可假定的 children 形态：仅包含已归一化的 virtualNode。 */
export type NormalizedChildren = NormalizedVirtualNode[]

/** 组件 render 归一化后的输出形态：要么 vnode，要么空。 */
export type NormalizedRenderOutput = NormalizedVirtualNode | undefined

/**
 * 将 render 返回的结果规整为 runtime-core 可消费的 VirtualNode。
 */
export function normalizeRenderOutput(output: RenderOutput): NormalizedRenderOutput {
  /* 空值与布尔值不会产生任何渲染输出，直接归一为空。 */
  if (isNil(output) || typeof output === 'boolean') {
    return undefined
  }

  /* 数组输出包裹为 Fragment，交由后续 children 归一化处理。 */
  if (Array.isArray(output)) {
    const fragmentVnode = createVirtualNode({
      type: Fragment,
      rawProps: {
        children: output as ComponentChildren,
      } satisfies FragmentProps,
    })

    return normalizeVirtualNodeForRuntime(fragmentVnode)
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
 * 深度规整 VirtualNode，确保 children 形态与 runtime 预期一致。
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
