import type { RendererOptions } from '../index.ts'
import { mountChild } from '../mount/child.ts'
import type { MountedHandle } from '../mount/handle.ts'
import type { ComponentInstance } from './context.ts'
import type { RenderOutput, SetupComponent } from '@/jsx-foundation/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/**
 * 挂载组件子树，必要时用首尾锚点包裹，保持兄弟顺序。
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
): MountedHandle<HostNode> | undefined {
  /* 不需要锚点时走普通挂载路径。 */
  if (!instance.shouldUseAnchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, {
      container: instance.container,
      context: {
        shouldUseAnchor: false,
        parent: instance,
        appContext: instance.appContext,
      },
    })
  }

  ensureComponentAnchors(options, instance, instance.latestHostAnchor)

  /* 将子树挂到 fragment，再按 endAnchor 顺序插入，避免宿主需特殊处理 fragment。 */
  const fragment = options.createFragment()
  const mounted = mountChild<HostNode, HostElement, HostFragment>(options, child, {
    container: fragment,
    context: {
      shouldUseAnchor: false,
      parent: instance,
      appContext: instance.appContext,
    },
  })

  for (const node of mounted?.nodes ?? []) {
    options.insertBefore(instance.container, node, instance.endAnchor as HostNode)
  }

  const nodes: HostNode[] = [
    instance.startAnchor as HostNode,
    ...(mounted?.nodes ?? []),
    instance.endAnchor as HostNode,
  ]

  return {
    ok: mounted?.ok ?? true,
    nodes,
    teardown(skipRemove?: boolean): void {
      mounted?.teardown(skipRemove)

      if (skipRemove) {
        return
      }

      if (instance.startAnchor) {
        options.remove(instance.startAnchor as HostNode)
      }

      if (instance.endAnchor && instance.endAnchor !== instance.startAnchor) {
        options.remove(instance.endAnchor as HostNode)
      }

      instance.startAnchor = undefined
      instance.endAnchor = undefined
    },
  }
}

/**
 * 仅保留组件锚点的占位句柄，供 render 为空或清空子树时复用；优先复用已有锚点。
 */
export function createComponentAnchorPlaceholder<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  anchor?: HostNode,
): MountedHandle<HostNode> {
  ensureComponentAnchors(options, instance, anchor)

  const nodes: HostNode[] = [instance.startAnchor as HostNode]

  if (instance.endAnchor && instance.endAnchor !== instance.startAnchor) {
    nodes.push(instance.endAnchor as HostNode)
  }

  return {
    ok: true,
    nodes,
    teardown(skipRemove?: boolean): void {
      if (skipRemove) {
        return
      }

      if (instance.startAnchor) {
        options.remove(instance.startAnchor as HostNode)
      }

      if (instance.endAnchor && instance.endAnchor !== instance.startAnchor) {
        options.remove(instance.endAnchor as HostNode)
      }

      instance.startAnchor = undefined
      instance.endAnchor = undefined
    },
  }
}

function ensureComponentAnchors<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  anchor?: HostNode,
): void {
  if (instance.startAnchor && instance.endAnchor) {
    if (anchor) {
      options.insertBefore(instance.container, instance.startAnchor as HostNode, anchor)

      if (instance.endAnchor !== instance.startAnchor) {
        options.insertBefore(instance.container, instance.endAnchor as HostNode, anchor)
      }
    }

    return
  }

  const nameLabel = instance.componentName ? `:${instance.componentName}` : ''
  const startLabel = __DEV__ ? `component-anchor-start${nameLabel}` : ''
  const endLabel = __DEV__ ? `component-anchor-end${nameLabel}` : ''
  const start = options.createComment(startLabel)
  const end = options.createComment(endLabel)

  if (anchor) {
    options.insertBefore(instance.container, start, anchor)
    options.insertBefore(instance.container, end, anchor)
  } else {
    options.appendChild(instance.container, start)
    options.appendChild(instance.container, end)
  }

  instance.startAnchor = start
  instance.endAnchor = end
}
