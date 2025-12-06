import type { RendererOptions } from '../index.ts'
import { mountChildren } from './mount-children.ts'
import type { MountedHandle } from './mounted-handle.ts'
import type { VirtualNode } from '@/jsx/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import { isRef } from '@/reactivity/index.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 创建宿主元素并同步 props 与 children。
 */
export function mountElement<HostNode, HostElement extends HostNode, HostFragment extends HostNode>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  type: string,
  virtualNode: VirtualNode,
  container: HostElement | HostFragment,
): MountedHandle<HostNode> {
  const { createElement, patchProps, appendChild, remove } = options
  const element = createElement(type)
  const props: PropsShape | undefined = virtualNode.props as PropsShape | undefined
  const refBinding = resolveElementRefBinding<HostElement>(props?.ref)

  /* 在挂载前先写入属性与事件。 */
  patchProps(element, props)
  /* 子节点交给 mountChildren，保持与 virtualNode 定义一致。 */
  const mountedHandles = mountChildren(options, virtualNode.children, element)
  /* 最终把元素插入到父容器中完成挂载。 */

  appendChild(container, element)

  assignElementRef(refBinding, element)

  return {
    nodes: [element],
    teardown(): void {
      for (const child of mountedHandles) {
        child.teardown()
      }

      assignElementRef(refBinding, undefined)

      remove(element)
    },
  }
}

type ElementRefBinding<HostElement> =
  | Ref<HostElement | undefined>
  | ((value: HostElement | undefined) => void)

/**
 * 将组件传入的 ref 属性规整为函数或 Ref 对象，便于统一回写。
 */
function resolveElementRefBinding<HostElement>(
  candidate: unknown,
): ElementRefBinding<HostElement> | undefined {
  if (typeof candidate === 'function') {
    return candidate as (value: HostElement | undefined) => void
  }

  if (isRef<HostElement | undefined>(candidate)) {
    return candidate
  }

  return undefined
}

/**
 * 在挂载或卸载阶段写回最新宿主元素，兼容函数 ref 与 Ref。
 */
function assignElementRef<HostElement>(
  target: ElementRefBinding<HostElement> | undefined,
  value: HostElement | undefined,
): void {
  if (!target) {
    return
  }

  if (typeof target === 'function') {
    target(value)

    return
  }

  target.value = value
}
