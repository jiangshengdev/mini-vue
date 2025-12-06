import type { RendererOptions } from '../../index.ts'
import { mountChild } from '../mount-child.ts'
import type { MountedHandle } from '../mounted-handle.ts'
import type { ComponentResult, SetupFunctionComponent } from '@/jsx/index.ts'
import type { ComponentInstance } from '../../component-instance.ts'

/**
 * 处理需要锚点的组件子树挂载，避免与兄弟节点混淆。
 */
export function mountChildWithAnchor<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  child: ComponentResult,
): MountedHandle<HostNode> | undefined {
  if (!instance.needsAnchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, instance.container)
  }

  ensureComponentAnchor(instance, options)

  if (!instance.anchor) {
    return mountChild<HostNode, HostElement, HostFragment>(options, child, instance.container)
  }

  const fragment = options.createFragment()
  const mounted = mountChild<HostNode, HostElement, HostFragment>(options, child, fragment)

  options.insertBefore(instance.container, fragment, instance.anchor)

  return mounted
}

function ensureComponentAnchor<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): void {
  if (instance.anchor) {
    return
  }

  const anchor = options.createText('') as HostNode

  options.appendChild(instance.container, anchor)

  instance.anchor = anchor
}
