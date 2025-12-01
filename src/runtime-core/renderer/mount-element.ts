import type { RendererOptions } from '../renderer.ts'
import { mountChildren } from './mount-children.ts'
import type { MountedChild } from './mounted-child.ts'
import type { VirtualNode } from '@/jsx/index.ts'

/**
 * 创建宿主元素并同步 props 与 children。
 */
export function mountElement<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  type: string,
  virtualNode: VirtualNode,
  container: HostElement | HostFragment,
): MountedChild<HostNode> {
  const { createElement, patchProps, appendChild, remove } = options
  const element = createElement(type)
  const props: Record<string, unknown> | undefined = virtualNode.props as
    | Record<string, unknown>
    | undefined

  /* 在挂载前先写入属性与事件。 */
  patchProps(element, props)
  /* 子节点交给 mountChildren，保持与 virtualNode 定义一致。 */
  const mountedChildren = mountChildren(options, virtualNode.children, element)
  /* 最终把元素插入到父容器中完成挂载。 */

  appendChild(container, element)

  return {
    nodes: [element],
    teardown(): void {
      for (const child of mountedChildren) {
        child.teardown()
      }

      remove(element)
    },
  }
}
