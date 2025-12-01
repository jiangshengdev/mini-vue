import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mount-child.ts'
import type { MountedChild } from './mounted-child.ts'
import type {
  ComponentResult,
  ComponentType,
  ElementProps,
  VirtualNode,
} from '@/jsx/index.ts'
import { ReactiveEffect } from '@/reactivity/effect.ts'

interface ComponentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
> {
  readonly type: T
  readonly container: HostElement | HostFragment
  readonly props: ElementProps<T>
  readonly effect: ReactiveEffect<ComponentResult>
  subTree?: ComponentResult
  mountedNodes: HostNode[]
  cleanup: Array<() => void>
}

/**
 * 执行函数组件并将返回的子树继续挂载到容器。
 */
export function mountComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  component: T,
  virtualNode: VirtualNode<T>,
  container: HostElement | HostFragment,
): MountedChild<HostNode> | undefined {
  const props = resolveComponentProps(virtualNode)
  const instance = createComponentInstance(
    options,
    component,
    props,
    container,
  ) as ComponentInstance<HostNode, HostElement, HostFragment, T>

  attachInstanceToVirtualNode(virtualNode, instance)

  return performInitialRender(instance, options)
}

function resolveComponentProps<T extends ComponentType>(
  virtualNode: VirtualNode<T>,
): ElementProps<T> {
  const props = (
    virtualNode.props ? { ...virtualNode.props } : {}
  ) as ElementProps<T>
  const childCount = virtualNode.children.length

  if (childCount === 1) {
    props.children = virtualNode.children[0]
  } else if (childCount > 1) {
    props.children = virtualNode.children
  }

  return props
}

function createComponentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  component: T,
  props: ElementProps<T>,
  container: HostElement | HostFragment,
): ComponentInstance<HostNode, HostElement, HostFragment, T> {
  let instance:
    | ComponentInstance<HostNode, HostElement, HostFragment, T>
    | undefined = undefined

  const effect = new ReactiveEffect<ComponentResult>(
    () => {
      const subtree = component(props)

      instance!.subTree = subtree

      return subtree
    },
    (job) => {
      rerenderComponent(instance!, options, job)
    },
  )

  const createdInstance: ComponentInstance<
    HostNode,
    HostElement,
    HostFragment,
    T
  > = {
    type: component,
    container,
    props,
    effect,
    mountedNodes: [],
    cleanup: [],
  }

  instance = createdInstance

  return createdInstance
}

function performInitialRender<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): MountedChild<HostNode> | undefined {
  const subtree = instance.effect.run()
  const mounted = mountChild(options, subtree, instance.container)

  instance.mountedNodes = mounted?.nodes ?? []

  return mounted
}

function rerenderComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  job: () => void,
): void {
  unmountComponentSubtree(instance, options)
  job()
  mountLatestSubtree(instance, options)
}

function unmountComponentSubtree<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): void {
  if (instance.mountedNodes.length === 0) {
    return
  }

  const { remove } = options

  for (const node of instance.mountedNodes) {
    remove(node)
  }

  instance.mountedNodes = []
}

function mountLatestSubtree<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): void {
  const mounted = mountChild(options, instance.subTree, instance.container)

  instance.mountedNodes = mounted?.nodes ?? []
}

function attachInstanceToVirtualNode<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  virtualNode: VirtualNode<T>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): void {
  type VirtualNodeWithInstance = VirtualNode<T> & {
    componentInstance?: ComponentInstance<
      HostNode,
      HostElement,
      HostFragment,
      T
    >
  }

  ;(virtualNode as VirtualNodeWithInstance).componentInstance = instance
}
