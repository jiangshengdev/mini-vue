import type { RendererOptions } from '../index.ts'
import type { MountedHandle } from '../mount/handle.ts'
import type { MountContext } from '../mount/context.ts'
import { attachInstanceToVirtualNode, createComponentInstance } from './instance.ts'
import { resolveComponentProps } from './props.ts'
import { performInitialRender } from './render-effect.ts'
import { setupComponent } from './setup.ts'
import { teardownComponentInstance } from './teardown.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'

/**
 * 执行函数组件并将返回的子树继续挂载到容器。
 */
export function mountComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: VirtualNode<SetupComponent>,
  container: HostElement | HostFragment,
  context?: MountContext,
): MountedHandle<HostNode> | undefined {
  const needsAnchor = context?.needsAnchor ?? false
  /* 准备实例前先规整 props，以免 setup 阶段读到旧引用。 */
  const props = resolveComponentProps(virtualNode)
  const component = virtualNode.type
  const instance = createComponentInstance(component, props, container, { ...context, needsAnchor })

  /* 让 virtualNode 拥有实例引用，方便调试或测试检索。 */
  attachInstanceToVirtualNode(virtualNode, instance)
  const setupSucceeded = setupComponent(instance)

  if (!setupSucceeded) {
    /* `setup` 阶段失败时直接清理实例并跳过挂载。 */
    teardownComponentInstance(options, instance)

    return undefined
  }

  /* 执行首次渲染并将子树挂载到宿主容器。 */
  const mounted = performInitialRender(options, instance)

  return {
    nodes: (mounted?.nodes ?? []) as HostNode[],
    /**
     * 卸载组件：统一走实例 teardown，内部会 stop scope/effect 并清理已挂载子树。
     */
    teardown(): void {
      teardownComponentInstance(options, instance)
    },
  }
}
