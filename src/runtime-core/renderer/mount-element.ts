import type { VNode } from '@/jsx'
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
  vnode: VNode,
  container: HostElement | HostFragment,
): HostNode {
  const { createElement, patchProps, appendChild } = options
  const el = createElement(type)
  const props = (vnode.props as Record<string, unknown> | null) ?? null

  /* 在挂载前先写入属性与事件。 */
  patchProps(el, props)
  /* 子节点交给 mountChildren，保持与 VNode 定义一致。 */
  mountChildren(options, vnode.children, el)
  /* 最终把元素插入到父容器中完成挂载。 */
  appendChild(container, el)

  return el
}
