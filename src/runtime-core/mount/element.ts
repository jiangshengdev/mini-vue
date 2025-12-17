import type { RendererOptions } from '../index.ts'
import { mountChildren } from './children.ts'
import type { MountContext } from './context.ts'
import type { MountedHandle } from './handle.ts'
import type { VirtualNode } from '@/jsx-foundation/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import { isRef } from '@/reactivity/index.ts'

/**
 * 创建宿主元素并同步 props 与 children。
 */
export function mountElement<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: VirtualNode<string>,
  container: HostElement | HostFragment,
  context?: MountContext,
): MountedHandle<HostNode> {
  const { createElement, patchProps, appendChild, remove } = options
  const element = createElement(virtualNode.type)
  const { props } = virtualNode
  const refBinding = resolveElementRefBinding<HostElement>(props?.ref)

  /* 在挂载前先写入属性与事件。 */
  patchProps(element, undefined, props)
  /* 子节点交给 mountChildren，保持与 virtualNode 定义一致。 */
  const mountedHandles = mountChildren(options, virtualNode.children, element, context)
  const ok = mountedHandles.every((handle) => {
    return handle.ok
  })
  /* 最终把元素插入到父容器中完成挂载。 */

  appendChild(container, element)

  assignElementRef(refBinding, element)

  return {
    ok,
    nodes: [element],
    /**
     * 卸载元素：先卸载子树与 ref，再移除自身，保证清理顺序可预期。
     */
    teardown(skipRemove?: boolean): void {
      for (const child of mountedHandles) {
        child.teardown(true)
      }

      assignElementRef(refBinding, undefined)

      if (!skipRemove) {
        remove(element)
      }
    },
  }
}

/**
 * 元素 ref 的统一抽象：支持回调 ref 与 `Ref` 容器两种写法。
 */
type ElementRefBinding<HostElement> =
  | Ref<HostElement | undefined>
  | ((value: HostElement | undefined) => void)

/**
 * 将组件传入的 ref 属性规整为函数或 Ref 对象，便于统一回写。
 */
export function resolveElementRefBinding<HostElement>(
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
export function assignElementRef<HostElement>(
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
