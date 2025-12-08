import type { RendererOptions } from '../index.ts'
import { mountComponent } from '@/runtime-core/component/index.ts'
import { mountElement } from './element.ts'
import { mountChild } from './child.ts'
import type { MountedHandle } from './handle.ts'
import type { SetupFunctionComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { Fragment } from '@/jsx-foundation/index.ts'

/**
 * 将通用 virtualNode 分派给组件或元素挂载路径。
 */
export function mountVirtualNode<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: VirtualNode,
  container: HostElement | HostFragment,
  needsAnchor = false,
): MountedHandle<HostNode> | undefined {
  /* Fragment 直接展开自身 children，不走组件路径。 */
  if (virtualNode.type === Fragment) {
    return mountChild(options, virtualNode.children, container)
  }

  /* 函数组件通过 mountComponent 执行并挂载其返回值。 */
  if (typeof virtualNode.type === 'function') {
    return mountComponent(
      options,
      virtualNode as VirtualNode<SetupFunctionComponent>,
      container,
      needsAnchor,
    )
  }

  /* 普通标签名直接走元素挂载逻辑。 */
  return mountElement(options, virtualNode.type, virtualNode, container)
}
