import { mountComponent } from '../component/index.ts'
import type { MountContext } from '../environment.ts'
import type { RendererOptions } from '../index.ts'
import { asRuntimeVirtualNode } from '../virtual-node.ts'
import { mountChild } from './child.ts'
import { mountElement } from './element.ts'
import type { MountedHandle } from './handle.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { Fragment } from '@/jsx-foundation/index.ts'

/**
 * 将通用 `virtualNode` 分派给组件或元素挂载路径。
 *
 * @remarks
 * 分派策略：
 * - `Fragment`：直接展开自身 `children`，不走组件路径。
 * - 函数组件：通过 `mountComponent` 执行并挂载其返回值。
 * - 普通标签名：走元素挂载逻辑（`mountElement`）。
 */
export function mountVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: VirtualNode,
  container: HostElement | HostFragment,
  context?: MountContext,
  anchor?: HostNode,
): MountedHandle<HostNode> | undefined {
  /* `Fragment` 直接展开自身 `children`，不走组件路径。 */
  if (virtualNode.type === Fragment) {
    const mounted = mountChild(options, virtualNode.children, {
      container,
      anchor,
      context,
    })
    const runtime = asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

    if (mounted) {
      runtime.el = mounted.nodes[0]
      runtime.anchor = mounted.nodes.at(-1)
      runtime.handle = mounted
      runtime.component = undefined
    }

    return mounted
  }

  /* 函数组件通过 `mountComponent` 执行并挂载其返回值。 */
  if (typeof virtualNode.type === 'function') {
    const mounted = mountComponent(
      options,
      virtualNode as VirtualNode<SetupComponent>,
      container,
      context,
      anchor,
    )

    const runtime = asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

    if (mounted) {
      runtime.handle = mounted
      runtime.el = mounted.nodes[0]
      runtime.anchor = mounted.nodes.at(-1)
    }

    return mounted
  }

  /* 普通标签名直接走元素挂载逻辑。 */
  const mounted = mountElement(
    options,
    virtualNode as VirtualNode<string>,
    container,
    context,
    anchor,
  )
  const runtime = asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  runtime.el = mounted.nodes[0]
  runtime.anchor = undefined
  runtime.handle = mounted
  runtime.component = undefined

  return mounted
}
