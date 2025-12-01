import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mount-child.ts'
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
  mountedNode?: HostNode
  pendingJob?: () => void
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
): HostNode | undefined {
  const props = resolveComponentProps(virtualNode)
  const instance = createComponentInstance(
    component,
    props,
    container,
  ) as ComponentInstance<HostNode, HostElement, HostFragment, T>

  attachInstanceToVirtualNode(virtualNode, instance)

  /* 首次渲染立即执行 effect，建立依赖并拿到最新子树。 */
  const subtree = instance.effect.run()

  instance.subTree = subtree
  instance.mountedNode = mountChild(options, subtree, container)

  return instance.mountedNode
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
  component: T,
  props: ElementProps<T>,
  container: HostElement | HostFragment,
): ComponentInstance<HostNode, HostElement, HostFragment, T> {
  let instance!: ComponentInstance<
    HostNode,
    HostElement,
    HostFragment,
    T
  >

  const effect = new ReactiveEffect<ComponentResult>(
    () => {
      const subtree = component(props)

      instance.subTree = subtree

      return subtree
    },
    (job) => {
      /* 暂存调度任务，后续阶段将用来触发组件级重新渲染。 */
      instance.pendingJob = job
    },
  )

  instance = {
    type: component,
    container,
    props,
    effect,
    cleanup: [],
  }

  return instance
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
