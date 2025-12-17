/**
 * Children diff/patch 实现（Phase A: 无 key 索引对齐）。
 */
import { patchChild } from './index.ts'
import { patchKeyedChildren, hasKeyedChildren } from './keyed-children.ts'
import { unmountChild } from './unmount.ts'
import type { RendererOptions } from '../renderer.ts'
import type { MountedHandle } from '../mount/handle.ts'
import { mountChild } from '../mount/child.ts'
import type { MountContext } from '../mount/context.ts'
import type { RenderOutput } from '@/jsx-foundation/index.ts'

/**
 * patch children 数组。
 *
 * @remarks
 * - 如果 children 包含 key，使用 keyed diff 算法
 * - 否则使用按索引对齐的简单算法
 *
 * @param options - 宿主渲染原语
 * @param oldChildren - 旧 children 数组
 * @param newChildren - 新 children 数组
 * @param container - 父容器
 * @param oldHandles - 旧 children 的挂载句柄数组
 * @param anchor - 插入锚点
 * @param context - 挂载上下文
 * @returns 新 children 的挂载句柄数组
 */
export function patchChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  oldChildren: RenderOutput[],
  newChildren: RenderOutput[],
  container: HostElement,
  oldHandles: Array<MountedHandle<HostNode> | undefined>,
  anchor?: HostNode,
  context?: MountContext,
): Array<MountedHandle<HostNode> | undefined> {
  /* 检查是否有 keyed children。 */
  if (hasKeyedChildren(oldChildren) || hasKeyedChildren(newChildren)) {
    return patchKeyedChildren(
      options,
      oldChildren,
      newChildren,
      container,
      oldHandles,
      anchor,
      context,
    )
  }

  /* 无 key 时使用简单的索引对齐算法。 */
  return patchUnkeyedChildren(
    options,
    oldChildren,
    newChildren,
    container,
    oldHandles,
    anchor,
    context,
  )
}

/**
 * patch unkeyed children 数组（按索引对齐）。
 */
function patchUnkeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  oldChildren: RenderOutput[],
  newChildren: RenderOutput[],
  container: HostElement,
  oldHandles: Array<MountedHandle<HostNode> | undefined>,
  anchor?: HostNode,
  context?: MountContext,
): Array<MountedHandle<HostNode> | undefined> {
  const commonLength = Math.min(oldChildren.length, newChildren.length)
  const newHandles: Array<MountedHandle<HostNode> | undefined> = []

  /* 1. patch 公共区间。 */
  for (let i = 0; i < commonLength; i++) {
    const handle = patchChild(
      options,
      oldChildren[i],
      newChildren[i],
      container,
      anchor,
      oldHandles[i],
      context,
    )

    newHandles.push(handle)
  }

  /* 2. mount 新增尾部。 */
  for (let i = commonLength; i < newChildren.length; i++) {
    const handle = mountChildAt(options, newChildren[i], container, anchor, context)

    newHandles.push(handle)
  }

  /* 3. unmount 旧的尾部。 */
  for (let i = commonLength; i < oldChildren.length; i++) {
    unmountChild(oldHandles[i])
  }

  return newHandles
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
