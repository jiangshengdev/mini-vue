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
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  child: RenderOutput,
): MountedHandle<HostNode> | undefined {
  /* 不需要锚点的组件直接复用容器尾部挂载策略。 */
  if (!instance.needsAnchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, instance.container, {
      needsAnchor: false,
      parent: instance,
    })
  }

  /* 需要锚点时先保证容器内已有占位符，便于后续插入片段。 */
  ensureComponentAnchor(options, instance)

  if (!instance.anchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, instance.container, {
      needsAnchor: false,
      parent: instance,
    })
  }

  /* 使用片段承载子树，整体插入到锚点之前以保持顺序。 */
  const fragment = options.createFragment()
  const mounted = mountChild<HostNode, HostElement, HostFragment>(options, child, fragment, {
    needsAnchor: false,
    parent: instance,
  })

  options.insertBefore(instance.container, fragment, instance.anchor)

  return mounted
}

/**
 * 为需要锚点的组件创建空文本占位符，保证兄弟节点插入位置固定。
 */
function ensureComponentAnchor<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): void {
  /* 已经创建过锚点时复用旧节点，避免重复插入。 */
  if (instance.anchor) {
    return
  }

  const anchor = options.createText('')

  options.appendChild(instance.container, anchor)

  instance.anchor = anchor
}
