import { mountChild } from '../mount/child.ts'
import type { MountedHandle } from '../mount/handle.ts'
import type { RendererOptions } from '../renderer.ts'
import { asRuntimeVirtualNode } from '../virtual-node.ts'
import type { ComponentInstance } from './context.ts'
import type { RenderOutput, SetupComponent } from '@/jsx-foundation/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/**
 * 处理需要锚点的组件子树挂载，避免与兄弟节点混淆。
 *
 * @remarks
 * - 当组件不是父容器的最后一个子节点时，需要首尾锚点来标记其占据的区间。
 * - 锚点为注释节点，不影响渲染结果但能保证后续兄弟节点的插入位置正确。
 */
export function mountComponentSubtreeWithAnchors<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  child: RenderOutput,
  anchor?: HostNode,
): MountedHandle<HostNode> | undefined {
  /* 不需要锚点的组件直接复用容器尾部挂载策略。 */
  if (!instance.shouldUseAnchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, {
      container: instance.container,
      anchor,
      context: {
        shouldUseAnchor: false,
        parent: instance,
      },
    })
  }

  /* 需要锚点时先准备首尾占位符，便于保持区间。 */
  ensureComponentAnchors(options, instance, anchor)

  /* 锚点创建失败时退化为普通挂载，避免影响渲染结果。 */
  if (!instance.startAnchor || !instance.endAnchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, {
      container: instance.container,
      anchor,
      context: {
        shouldUseAnchor: false,
        parent: instance,
      },
    })
  }

  /* 使用片段承载子树，整体插入到 endAnchor 之前以保持顺序。 */
  const fragment = options.createFragment()
  const mounted = mountChild<HostNode, HostElement, HostFragment>(options, child, {
    container: fragment,
    context: {
      shouldUseAnchor: false,
      parent: instance,
    },
  })

  /* 逐个插入 `Fragment` 子节点，避免依赖宿主对 `Fragment` 的特殊处理。 */
  for (const node of mounted?.nodes ?? []) {
    options.insertBefore(instance.container, node, instance.endAnchor)
  }

  const nodes: HostNode[] = [instance.startAnchor, ...(mounted?.nodes ?? []), instance.endAnchor]

  return {
    ok: mounted?.ok ?? true,
    nodes,
    /** 卸载组件子树：先转调子树 `teardown`，再按需移除首尾锚点。 */
    teardown(skipRemove?: boolean): void {
      mounted?.teardown(skipRemove)

      if (skipRemove) {
        return
      }

      options.remove(instance.startAnchor as HostNode)
      options.remove(instance.endAnchor as HostNode)
      instance.startAnchor = undefined
      instance.endAnchor = undefined
    },
  }
}

/**
 * 为需要锚点的组件创建首尾注释占位符，保证兄弟节点插入位置固定。
 *
 * @remarks
 * - 首锚点标记组件子树的起始位置，尾锚点标记结束位置。
 * - 后续兄弟节点会插入到尾锚点之后，避免与组件子树混淆。
 */
export function ensureComponentAnchors<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  anchor?: HostNode,
): void {
  /* 已经创建过锚点时复用旧节点，避免重复插入。 */
  if (instance.startAnchor && instance.endAnchor) {
    return
  }

  const nameLabel = instance.componentName ? `:${instance.componentName}` : ''
  const startLabel = __DEV__ ? `component-anchor-start${nameLabel}` : ''
  const endLabel = __DEV__ ? `component-anchor-end${nameLabel}` : ''
  const start = options.createComment(startLabel)
  const end = options.createComment(endLabel)

  /*
   * 锚点插入策略：
   * - 组件已挂载过子树时，`start` 必须插到「当前首个宿主节点」之前，才能正确包裹区间。
   * - `end` 需要插到父级传入的 `anchor` 之前（或容器末尾），保证后续兄弟仍位于组件区间之外。
   */
  const firstMountedNode = instance.vnodeHandle?.nodes[0] ?? instance.mountedHandle?.nodes[0]

  if (firstMountedNode) {
    options.insertBefore(instance.container, start, firstMountedNode)
  } else if (anchor) {
    options.insertBefore(instance.container, start, anchor)
  } else {
    options.appendChild(instance.container, start)
  }

  if (anchor) {
    options.insertBefore(instance.container, end, anchor)
  } else {
    options.appendChild(instance.container, end)
  }

  instance.startAnchor = start
  instance.endAnchor = end
}

/**
 * 同步组件 vnode 句柄的节点集合，确保父级 `children diff` 能移动到正确的「最新子树」。
 *
 * @remarks
 * - 组件重渲染可能会卸载/新挂载宿主节点（例如 `render` 从 `<li />` 变为 `undefined`）。
 * - 若不更新 `vnodeHandle.nodes`，父级重排会把「旧节点引用」重新插回 DOM，产生重复元素。
 */
export function syncComponentVirtualNodeHandleNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  const handle = instance.vnodeHandle

  /* 没有组件 vnode 句柄时无需同步：父级 diff 也不会移动到该组件节点集合。 */
  if (!handle) {
    return
  }

  /* 从组件最新 `subTree` 的句柄中读取宿主节点集合，作为同步来源。 */
  const subtreeNodes = instance.subTree
    ? (asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(instance.subTree).handle?.nodes ??
      [])
    : []
  const nodes: HostNode[] = []

  /* 组件带锚点时 `nodes` 必须包含区间边界，保证父级移动/插入能稳定定位。 */
  if (instance.startAnchor && instance.endAnchor) {
    nodes.push(instance.startAnchor, ...subtreeNodes, instance.endAnchor)
  } else {
    nodes.push(...subtreeNodes)
  }

  /* 原地更新 `handle.nodes` 引用，避免父级 keyed diff 持有的句柄对象失效。 */
  handle.nodes.length = 0
  handle.nodes.push(...nodes)

  /* 同步运行时 vnode 元数据，确保 `vnode.el`/`vnode.anchor` 与 `handle.nodes` 一致。 */
  if (instance.virtualNode) {
    instance.virtualNode.el = handle.nodes[0]
    instance.virtualNode.anchor = handle.nodes.at(-1)
    instance.virtualNode.handle = handle
  }
}
