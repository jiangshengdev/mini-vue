import type { VirtualNode } from '@/jsx'
import type { RendererOptions } from '../renderer.ts'
import { mountChildren } from './mount-children.ts'

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
): HostNode {
  const { createElement, patchProps, appendChild } = options
  const element = createElement(type)
  const props = (virtualNode.props as Record<string, unknown> | null) ?? null

  /* 在挂载前先写入属性与事件。 */
  patchProps(element, props)
  /* 子节点交给 mountChildren，保持与 virtualNode 定义一致。 */
  mountChildren(options, virtualNode.children, element)
  /* 最终把元素插入到父容器中完成挂载。 */
  appendChild(container, element)

  return element
}
