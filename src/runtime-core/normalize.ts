import { Fragment, createTextVirtualNode, createVirtualNode, isVirtualNode } from '@/jsx-foundation/index.ts'
import type { ComponentChildren, FragmentProps, RenderOutput, VirtualNode } from '@/jsx-foundation/index.ts'
import { isNil } from '@/shared/index.ts'

export type NormalizedRenderOutput = VirtualNode | RenderOutput | undefined

/**
 * 将 render 返回的结果规整为 runtime-core 可消费的 VirtualNode。
 */
export function normalizeRenderOutput(output: RenderOutput): NormalizedRenderOutput {
  if (isNil(output) || typeof output === 'boolean') {
    return undefined
  }

  if (Array.isArray(output)) {
    return normalizeVNodeForRuntime(
      createVirtualNode({
        type: Fragment,
        rawProps: {
          children: output as ComponentChildren,
        } as FragmentProps,
      }),
    )
  }

  if (isVirtualNode(output)) {
    return normalizeVNodeForRuntime(output)
  }

  if (typeof output === 'string' || typeof output === 'number') {
    return createTextVirtualNode(output)
  }

  return output
}

function normalizeVNodeForRuntime(vnode: VirtualNode): VirtualNode {
  const children = vnode.children.map((child) => {
    if (isVirtualNode(child)) {
      return normalizeVNodeForRuntime(child)
    }

    if (typeof child === 'string' || typeof child === 'number') {
      return createTextVirtualNode(child)
    }

    return child as never
  })

  return {
    ...vnode,
    children,
  }
}
