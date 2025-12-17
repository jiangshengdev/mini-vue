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
  if (isNil(output) || typeof output === 'boolean') {
    return undefined
  }

  if (Array.isArray(output)) {
    const fragmentVnode = createVirtualNode({
      type: Fragment,
      rawProps: {
        children: output as ComponentChildren,
      } satisfies FragmentProps,
    })

    return normalizeVnodeForRuntime(fragmentVnode)
  }

  if (isVirtualNode(output)) {
    return normalizeVnodeForRuntime(output)
  }

  if (typeof output === 'string' || typeof output === 'number') {
    return createTextVirtualNode(output)
  }

  return undefined
}

function normalizeVnodeForRuntime(vnode: VirtualNode): VirtualNode {
  const children = vnode.children.map((child) => {
    if (isVirtualNode(child)) {
      return normalizeVnodeForRuntime(child)
    }

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
