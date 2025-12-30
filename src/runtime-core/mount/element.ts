import type { ChildEnvironment } from '../environment.ts'
import type { RendererOptions } from '../index.ts'
import { mountElementChildren } from './children.ts'
import type { MountedHandle } from './handle.ts'
import type { VirtualNode } from '@/jsx-foundation/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import { isRef } from '@/reactivity/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

/**
 * 创建宿主元素并同步 `props` 与 `children`。
 *
 * @remarks
 * 挂载顺序：
 * 1. 创建宿主元素节点。
 * 2. 写入属性与事件（`patchProps`）。
 * 3. 挂载子节点（`mountElementChildren`）。
 * 4. 将元素插入到父容器。
 * 5. 绑定 `ref`（若存在）。
 */
export function mountElement<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: VirtualNode<string>,
  environment: ChildEnvironment<HostNode, HostElement, HostFragment>,
): MountedHandle<HostNode> {
  const { container, context, anchor } = environment
  const { createElement, patchProps, appendChild, insertBefore, remove } = options
  const element = createElement(virtualNode.type)
  const { props } = virtualNode
  const refBinding = resolveElementRefBinding<HostElement>(props?.ref)

  /* 在挂载前先写入属性与事件。 */
  patchProps(element, undefined, props)
  /* 子节点交给 `mountElementChildren`，保持与 `virtualNode` 定义一致。 */
  const mountedHandles = mountElementChildren(options, virtualNode.children, element, context)
  const ok = mountedHandles.every((handle) => {
    return handle.ok
  })

  /* 最终把元素插入到父容器中完成挂载。 */
  if (anchor) {
    insertBefore(container, element, anchor)
  } else {
    appendChild(container, element)
  }

  assignElementRef(refBinding, element)

  return {
    ok,
    nodes: [element],
    /**
     * 卸载元素：先卸载子树与 `ref`，再移除自身，保证清理顺序可预期。
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
 * 元素 `ref` 的统一抽象：支持回调 `ref` 与 `Ref` 容器两种写法。
 *
 * @remarks
 * - 回调 `ref`：`(el) => { ... }`，挂载时传入元素，卸载时传入 `undefined`。
 * - `Ref` 容器：`ref<HTMLElement>()`，挂载时写入 `.value`，卸载时置为 `undefined`。
 */
type ElementRefBinding<HostElement> =
  | Ref<HostElement | undefined>
  | ((value: HostElement | undefined) => void)

/**
 * 将组件传入的 `ref` 属性规整为函数或 `Ref` 对象，便于统一回写。
 *
 * @remarks
 * - 函数类型直接返回。
 * - `Ref` 对象通过 `isRef` 判断后返回。
 * - 其他类型返回 `undefined`，表示无有效 `ref` 绑定。
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
 * 在挂载或卸载阶段写回最新宿主元素，兼容函数 `ref` 与 `Ref`。
 */
export function assignElementRef<HostElement>(
  target: ElementRefBinding<HostElement> | undefined,
  value: HostElement | undefined,
): void {
  if (!target) {
    return
  }

  if (typeof target === 'function') {
    runSilent(
      () => {
        target(value)
      },
      {
        origin: errorContexts.elementRef,
        handlerPhase: errorPhases.sync,
      },
    )

    return
  }

  runSilent(
    () => {
      target.value = value
    },
    {
      origin: errorContexts.elementRef,
      handlerPhase: errorPhases.sync,
    },
  )
}
