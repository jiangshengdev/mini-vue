import type { RendererOptions } from '../index.ts'
import { mountChild } from '../mount/child.ts'
import type { MountedHandle } from '../mount/handle.ts'
import type { ComponentInstance } from './context.ts'
import type { RenderOutput, SetupComponent } from '@/jsx-foundation/index.ts'

/**
 * 处理需要锚点的组件子树挂载，避免与兄弟节点混淆。
 */
export function mountChildWithAnchor<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  child: RenderOutput,
): MountedHandle<HostNode> | undefined {
  /* 不需要锚点的组件直接复用容器尾部挂载策略。 */
  if (!instance.shouldUseAnchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, {
      container: instance.container,
      context: {
        shouldUseAnchor: false,
        parent: instance,
      },
    })
  }

  /* 需要锚点时先准备首尾占位符，便于保持区间。 */
  ensureComponentAnchors(options, instance)

  if (!instance.startAnchor || !instance.endAnchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, {
      container: instance.container,
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
 * 为需要锚点的组件创建首尾空文本占位符，保证兄弟节点插入位置固定。
 */
function ensureComponentAnchors<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): void {
  /* 已经创建过锚点时复用旧节点，避免重复插入。 */
  if (instance.startAnchor && instance.endAnchor) {
    return
  }

  const start = options.createText('')
  const end = options.createText('')

  options.appendChild(instance.container, start)
  options.appendChild(instance.container, end)

  instance.startAnchor = start
  instance.endAnchor = end
}
