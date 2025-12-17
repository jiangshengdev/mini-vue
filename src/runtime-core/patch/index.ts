/**
 * 子节点 patch 入口，根据新旧节点类型分派到对应处理逻辑。
 */
import { patchChildren } from './children.ts'
import { unmountChild } from './unmount.ts'
import type { RendererOptions } from '../renderer.ts'
import type { RuntimeVNode } from '../vnode.ts'
import type { MountedHandle } from '../mount/handle.ts'
import { mountChild } from '../mount/child.ts'
import type { MountContext } from '../mount/context.ts'
import type { RenderOutput, VirtualNode } from '@/jsx-foundation/index.ts'
import { isVirtualNode } from '@/jsx-foundation/index.ts'
import { isNil } from '@/shared/index.ts'

/**
 * 判断两个 VNode 是否为"相同类型"可复用节点。
 *
 * @remarks
 * - 类型必须严格相等
 * - 若有 key 则 key 必须相等
 */
export function isSameVNodeType(
  oldVNode: VirtualNode | RuntimeVNode,
  newVNode: VirtualNode | RuntimeVNode,
): boolean {
  return oldVNode.type === newVNode.type && oldVNode.key === newVNode.key
}

/**
 * 判断两个子节点是否都是原始文本（string/number）。
 */
function areBothText(
  oldChild: RenderOutput | undefined,
  newChild: RenderOutput | undefined,
): boolean {
  const oldIsText = typeof oldChild === 'string' || typeof oldChild === 'number'
  const newIsText = typeof newChild === 'string' || typeof newChild === 'number'

  return oldIsText && newIsText
}

/**
 * 判断子节点是否为空（null/undefined/boolean）。
 */
function isEmptyChild(child: RenderOutput | undefined): boolean {
  return isNil(child) || typeof child === 'boolean'
}

/**
 * patch 单个子节点，根据新旧类型执行复用或替换。
 *
 * @param options - 宿主渲染原语
 * @param oldChild - 旧子节点（可能为空）
 * @param newChild - 新子节点（可能为空）
 * @param container - 父容器
 * @param anchor - 插入锚点
 * @param oldHandle - 旧节点的挂载句柄（用于 teardown）
 * @param context - 挂载上下文
 * @returns 新节点的挂载句柄
 */
export function patchChild<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  oldChild: RenderOutput | undefined,
  newChild: RenderOutput | undefined,
  container: HostElement | HostFragment,
  anchor: HostNode | undefined,
  oldHandle: MountedHandle<HostNode> | undefined,
  context?: MountContext,
): MountedHandle<HostNode> | undefined {
  /* 新旧都为空，无需操作。 */
  if (isEmptyChild(oldChild) && isEmptyChild(newChild)) {
    return undefined
  }

  /* 旧为空，新不为空：直接挂载新节点。 */
  if (isEmptyChild(oldChild)) {
    return mountChildAt(options, newChild, container, anchor, context)
  }

  /* 新为空，旧不为空：卸载旧节点。 */
  if (isEmptyChild(newChild)) {
    unmountChild(oldHandle)

    return undefined
  }

  /* 两者都是原始文本：复用文本节点，仅更新内容。 */
  if (areBothText(oldChild, newChild)) {
    const textNode = oldHandle?.nodes[0]

    if (textNode) {
      const newText = String(newChild)
      const oldText = String(oldChild)

      if (oldText !== newText) {
        options.setText(textNode, newText)
      }

      return {
        ok: true,
        nodes: [textNode],
        teardown(skipRemove?: boolean): void {
          if (!skipRemove) {
            options.remove(textNode)
          }
        },
      }
    }

    /* 无旧节点引用，回退到挂载。 */
    return mountChildAt(options, newChild, container, anchor, context)
  }

  /* 两者都是 VNode。 */
  if (isVirtualNode(oldChild) && isVirtualNode(newChild)) {
    /* 类型+key 相同，可复用。 */
    if (isSameVNodeType(oldChild, newChild)) {
      return patchVNode(options, oldChild, newChild, container, anchor, oldHandle, context)
    }

    /* 类型不同，卸载旧节点并挂载新节点。 */
    unmountChild(oldHandle)

    return mountChildAt(options, newChild, container, anchor, context)
  }

  /* 两者都是数组：patch 数组 children。 */
  if (Array.isArray(oldChild) && Array.isArray(newChild)) {
    return patchArrayChildren(options, oldChild, newChild, container, oldHandle, context)
  }

  /* 类型切换（如 text→element 或 element→text）：卸载旧节点，挂载新节点。 */
  unmountChild(oldHandle)

  return mountChildAt(options, newChild, container, anchor, context)
}

/**
 * 在指定锚点前挂载子节点。
 */
function mountChildAt<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  child: RenderOutput | undefined,
  container: HostElement | HostFragment,
  anchor: HostNode | undefined,
  context?: MountContext,
): MountedHandle<HostNode> | undefined {
  if (anchor) {
    /* 有锚点时，先挂载到 fragment，再整体插入到锚点前。 */
    const fragment = options.createFragment()
    const mounted = mountChild(options, child, fragment, context)

    for (const node of mounted?.nodes ?? []) {
      options.insertBefore(container, node, anchor)
    }

    return mounted
  }

  /* 无锚点，直接挂载到容器末尾。 */
  return mountChild(options, child, container, context)
}

/**
 * patch 两个数组 children。
 *
 * @remarks
 * 数组 mount 时会创建 startAnchor 和 endAnchor 包裹内容。
 * patch 时复用这些 anchors，在 endAnchor 之前执行 children diff。
 */
function patchArrayChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  oldChildren: RenderOutput[],
  newChildren: RenderOutput[],
  container: HostElement | HostFragment,
  oldHandle: MountedHandle<HostNode> | undefined,
  context?: MountContext,
): MountedHandle<HostNode> | undefined {
  const oldNodes = oldHandle?.nodes ?? []

  /*
   * 数组挂载时结构为 [startAnchor, ...childNodes, endAnchor]
   * 我们需要复用 anchors 并在 endAnchor 前执行 patch。
   */
  if (oldNodes.length < 2) {
    /* 没有有效的 anchor 结构，回退到卸载+重挂载。 */
    unmountChild(oldHandle)

    return mountChild(options, newChildren, container, context)
  }

  const startAnchor = oldNodes[0]
  const endAnchor = oldNodes[oldNodes.length - 1]

  /*
   * 获取旧 children 的挂载句柄。
   * 数组 mount 返回的 nodes 包含 anchors，但 teardowns 只包含 children 的 teardown。
   * 我们需要从 oldHandle 中提取 children handles。
   */
  type ArrayHandleWithChildren = MountedHandle<HostNode> & {
    _childHandles?: Array<MountedHandle<HostNode> | undefined>
  }
  const arrayHandle = oldHandle as ArrayHandleWithChildren
  let oldChildHandles = arrayHandle._childHandles ?? []

  /*
   * 如果没有记录 childHandles，说明是首次 patch。
   * 需要清除旧内容（anchors 之间的节点），然后重新挂载。
   */
  if (oldChildHandles.length === 0 && oldChildren.length > 0) {
    /* 移除 anchors 之间的所有节点。 */
    for (let i = 1; i < oldNodes.length - 1; i++) {
      options.remove(oldNodes[i])
    }

    oldChildHandles = []
  }

  /* 执行 children patch，在 endAnchor 前挂载新节点。 */
  const newChildHandles = patchChildren(
    options,
    oldChildHandles.length === 0 ? [] : oldChildren,
    newChildren,
    container as HostElement,
    oldChildHandles,
    endAnchor,
    context,
  )

  /* 存储新的 childHandles。 */
  arrayHandle._childHandles = newChildHandles

  /* 收集所有节点（包括 anchors）。 */
  const newNodes: HostNode[] = [startAnchor]

  for (const handle of newChildHandles) {
    if (handle) {
      for (const node of handle.nodes) {
        newNodes.push(node)
      }
    }
  }

  newNodes.push(endAnchor)

  return {
    ok: true,
    nodes: newNodes,
    _childHandles: newChildHandles,
    teardown(skipRemove?: boolean): void {
      for (const handle of newChildHandles) {
        handle?.teardown(skipRemove)
      }

      if (!skipRemove) {
        options.remove(startAnchor)
        options.remove(endAnchor)
      }
    },
  } as MountedHandle<HostNode>
}

/**
 * patch 两个同类型 VNode。
 */
function patchVNode<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  oldVNode: VirtualNode,
  newVNode: VirtualNode,
  container: HostElement | HostFragment,
  anchor: HostNode | undefined,
  oldHandle: MountedHandle<HostNode> | undefined,
  context?: MountContext,
): MountedHandle<HostNode> | undefined {
  const { type } = newVNode

  /* 元素节点：patch props + children。 */
  if (typeof type === 'string') {
    return patchElement(options, oldVNode, newVNode, oldHandle)
  }

  /* 组件节点：暂时走卸载+重挂载路径，后续 task 10 会改为真正的组件更新。 */
  unmountChild(oldHandle)

  return mountChildAt(options, newVNode, container, anchor, context)
}

/**
 * patch 元素节点：更新 props 和 children。
 */
function patchElement<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  oldVNode: VirtualNode<string>,
  newVNode: VirtualNode<string>,
  oldHandle: MountedHandle<HostNode> | undefined,
): MountedHandle<HostNode> | undefined {
  const el = oldHandle?.nodes[0] as HostElement | undefined

  if (!el) {
    return undefined
  }

  /* 差量更新 props。 */
  options.patchProps(el, oldVNode.props, newVNode.props)

  /* patch children（调用 patchChildren，后续任务实现）。 */
  const oldChildren = oldVNode.children
  const newChildren = newVNode.children

  /* 获取旧 children 的挂载句柄（存储在元素的 _childHandles 中）。 */
  type ElementWithHandles = HostElement & {
    _childHandles?: Array<MountedHandle<HostNode> | undefined>
  }
  const elWithHandles = el as ElementWithHandles
  let oldChildHandles = elWithHandles._childHandles ?? []

  /*
   * 如果 oldChildHandles 为空但 oldChildren 不为空，说明这是首次 patch。
   * 首次 mount 时 children 是通过 mountChildren 挂载的，没有记录 handles。
   * 此时需要清空元素内容，然后重新挂载 children。
   */
  if (oldChildHandles.length === 0 && oldChildren.length > 0) {
    options.clear(el)
    oldChildHandles = []
  }

  /* 执行 children patch。 */
  const newChildHandles = patchChildren(
    options,
    oldChildHandles.length === 0 ? [] : oldChildren,
    newChildren,
    el,
    oldChildHandles,
  )

  /* 存储新的挂载句柄。 */
  elWithHandles._childHandles = newChildHandles

  return {
    ok: true,
    nodes: [el],
    teardown(skipRemove?: boolean): void {
      /* 先卸载 children。 */
      for (const handle of newChildHandles) {
        handle?.teardown(true)
      }

      if (!skipRemove) {
        options.remove(el)
      }
    },
  }
}
