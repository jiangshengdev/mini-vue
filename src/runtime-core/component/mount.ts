import type { MountContext } from '../environment.ts'
import type { RendererOptions } from '../index.ts'
import type { MountedHandle } from '../mount/handle.ts'
import { asRuntimeVirtualNode } from '../virtual-node.ts'
import type { ComponentInstance } from './context.ts'
import { attachInstanceToVirtualNode, createComponentInstance } from './instance.ts'
import { createComponentPropsState, resolveComponentProps } from './props.ts'
import { performInitialRender } from './render-effect.ts'
import { setupComponent } from './setup.ts'
import { teardownComponentInstance } from './teardown.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'

/**
 * 执行函数组件并将返回的子树继续挂载到容器。
 *
 * @remarks
 * 组件挂载流程：
 * 1. 规整 `props` 并创建组件实例。
 * 2. 执行 `setup` 获取渲染闭包。
 * 3. 创建响应式 `effect` 并执行首次渲染。
 * 4. 将子树挂载到宿主容器。
 */
export function mountComponent<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: VirtualNode<SetupComponent>,
  container: HostElement | HostFragment,
  context?: MountContext,
  anchor?: HostNode,
): MountedHandle<HostNode> | undefined {
  const shouldUseAnchor = context?.shouldUseAnchor ?? false
  /* 准备实例前先规整 `props`，以免 `setup` 阶段读到旧引用。 */
  const props = resolveComponentProps(virtualNode)
  const propsState = createComponentPropsState(props)
  const component = virtualNode.type
  const instance = createComponentInstance(component, propsState, container, {
    ...context,
    shouldUseAnchor,
  })
  const runtime = asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  /* 让 `virtualNode` 拥有实例引用，方便调试或测试检索。 */
  attachInstanceToVirtualNode(virtualNode, instance)
  runtime.component = instance as never
  /* 缓存当前组件对应的运行时 vnode 引用，便于更新阶段同步 `el`/`anchor`/`handle.nodes`。 */
  instance.virtualNode = runtime as never
  const { startAnchor, endAnchor } = instance

  runtime.el = startAnchor ? (startAnchor as HostNode) : undefined
  runtime.anchor = endAnchor ? (endAnchor as HostNode) : undefined

  const setupSucceeded = setupComponent(instance)

  if (!setupSucceeded) {
    /* `setup` 阶段失败时直接清理实例并跳过挂载。 */
    teardownComponentInstance(options, instance)

    return undefined
  }

  /* 执行首次渲染并将子树挂载到宿主容器。 */
  const initialRender = performInitialRender<HostNode, HostElement, HostFragment, SetupComponent>(
    options,
    instance as ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>,
    anchor,
  )

  runtime.handle = initialRender

  const vnodeHandle: MountedHandle<HostNode> = {
    ok: initialRender.ok,
    nodes: initialRender.nodes,
    /**
     * 卸载组件：统一走实例 `teardown`，内部会 stop `scope`/`effect` 并清理已挂载子树。
     */
    teardown(skipRemove?: boolean): void {
      teardownComponentInstance(options, instance, skipRemove)
    },
  }

  /* 记录组件 vnode 句柄，供父级 keyed diff 在移动/卸载时复用。 */
  instance.vnodeHandle = vnodeHandle

  return vnodeHandle
}
