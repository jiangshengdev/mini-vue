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
  HostNode extends object,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
> {
  readonly type: T
  readonly container: HostElement | HostFragment
  readonly props: ElementProps<T>
  readonly effect: ReactiveEffect<ComponentResult>
  subTree?: ComponentResult
  mountedChild?: MountedChild<HostNode>
  cleanup: Array<() => void>
}

/**
 * 执行函数组件并将返回的子树继续挂载到容器。
 */
export function mountComponent<
  HostNode extends object,
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

  const mounted = performInitialRender(instance, options)

  if (!mounted) {
    return undefined
  }

  return {
    nodes: mounted.nodes,
    teardown(): void {
      teardownComponentInstance(instance)
    },
  }
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
  HostNode extends object,
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
    cleanup: [],
  }

  instance = createdInstance

  return createdInstance
}

function performInitialRender<
  HostNode extends object,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): MountedChild<HostNode> | undefined {
  const subtree = instance.effect.run()
  const mounted = mountChild(options, subtree, instance.container)

  instance.mountedChild = mounted

  return mounted
}

function rerenderComponent<
  HostNode extends object,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  job: () => void,
): void {
  teardownMountedSubtree(instance)
  job()
  mountLatestSubtree(instance, options)
}

function teardownMountedSubtree<
  HostNode extends object,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): void {
  if (!instance.mountedChild) {
    return
  }

  instance.mountedChild.teardown()
  instance.mountedChild = undefined
}

function mountLatestSubtree<
  HostNode extends object,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): void {
  const mounted = mountChild(options, instance.subTree, instance.container)

  instance.mountedChild = mounted
}

function teardownComponentInstance<
  HostNode extends object,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): void {
  teardownMountedSubtree(instance)
  instance.effect.stop()

  if (instance.cleanup.length > 0) {
    const tasks = [...instance.cleanup]

    instance.cleanup = []

    for (const task of tasks) {
      task()
    }
  }
}

function attachInstanceToVirtualNode<
  HostNode extends object,
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
