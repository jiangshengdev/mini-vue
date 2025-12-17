import {
  createTextVirtualNode,
  createVirtualNode,
  Fragment,
  isVirtualNode,
} from '@/jsx-foundation/index.ts'
import type {
  ComponentChildren,
  FragmentProps,
  RenderOutput,
  VirtualNode,
} from '@/jsx-foundation/index.ts'
import { isNil } from '@/shared/index.ts'

export type NormalizedRenderOutput = VirtualNode | undefined

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

    return normalizeVnodeForRuntime(fragmentVnode)
  }

  /* 已是 VirtualNode 时递归规整内部 children，保持形态一致。 */
  if (isVirtualNode(output)) {
    return normalizeVnodeForRuntime(output)
  }

  /* 原始文本输出转为 Text VirtualNode，便于统一渲染路径。 */
  if (typeof output === 'string' || typeof output === 'number') {
    return createTextVirtualNode(output)
  }

  return undefined
}

/**
 * 深度规整 VirtualNode，确保 children 形态与 runtime 预期一致。
 */
function normalizeVnodeForRuntime(vnode: VirtualNode): VirtualNode {
  /* 递归归一化子节点，统一 VirtualNode 与文本节点的表达方式。 */
  const children = vnode.children.map((child) => {
    if (isVirtualNode(child)) {
      return normalizeVnodeForRuntime(child)
    }

    /* 文本子节点转为 Text VirtualNode，便于 diff 与挂载复用同一路径。 */
    if (typeof child === 'string' || typeof child === 'number') {
      return createTextVirtualNode(child)
    }

    return child
  })

  return {
    ...vnode,
    children,
  }
}
