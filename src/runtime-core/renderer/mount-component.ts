import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mount-child.ts'
import type { MountedHandle } from './mounted-handle.ts'
import type {
  ComponentResult,
  ComponentType,
  ElementProps,
  VirtualNode,
} from '@/jsx/index.ts'
import { ReactiveEffect } from '@/reactivity/effect.ts'

/**
 * 组件运行期实例，封装当前 props、子树与副作用句柄。
 */
interface ComponentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
> {
  /** 组件定义本身，主要用于调试或重复渲染。 */
  readonly type: T
  /** 当前组件挂载的宿主容器，子树会插入到此处。 */
  readonly container: HostElement | HostFragment
  /** latest props 快照，供组件执行阶段读取。 */
  readonly props: ElementProps<T>
  /** 承载组件副作用的响应式 effect。 */
  readonly effect: ReactiveEffect<ComponentResult>
  /** 最近一次 render 的虚拟子树，用于二次挂载。 */
  subTree?: ComponentResult
  /** 子树挂载后返回的宿主节点集合。 */
  mountedHandle?: MountedHandle<HostNode>
  /** 附加清理任务列表（如自定义副作用）。 */
  cleanupCallbacks: Array<() => void>
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
): MountedHandle<HostNode> | undefined {
  const props = resolveComponentProps(virtualNode)
  const instance = createComponentInstance(options, component, props, container)

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

/**
 * 规整组件 props，并根据 children 数量注入合适的 children 形态。
 */
function resolveComponentProps<T extends ComponentType>(
  virtualNode: VirtualNode<T>,
): ElementProps<T> {
  const props = (
    virtualNode.props ? { ...virtualNode.props } : {}
  ) as ElementProps<T>
  const childCount = virtualNode.children.length

  /* 保持 JSX 约定：单个 children 直接给值，多个 children 传数组。 */
  if (childCount === 1) {
    props.children = virtualNode.children[0]
  } else if (childCount > 1) {
    props.children = virtualNode.children
  }

  return props
}

/**
 * 创建组件实例与关联的 effect，负责管理子树与清理逻辑。
 */
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

  /* 组件 effect 会收集依赖并在响应式变更时触发 renderJob。 */
  const effect = new ReactiveEffect<ComponentResult>(
    () => {
      /* 执行组件获取最新子树并缓存，供后续重新挂载使用。 */
      const subtree = component(props)

      instance!.subTree = subtree

      return subtree
    },
    (renderJob) => {
      /* 调度回调负责清空旧子树并重新执行 renderJob。 */
      rerenderComponent(instance!, options, renderJob)
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
    cleanupCallbacks: [],
  }

  instance = createdInstance

  return createdInstance
}

/**
 * 运行组件 effect 并将首个结果挂载到容器。
 */
function performInitialRender<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): MountedHandle<HostNode> | undefined {
  const subtree = instance.effect.run()
  const mounted = mountChild(options, subtree, instance.container)

  instance.mountedHandle = mounted

  return mounted
}

/**
 * rerender 时先卸载旧子树，再运行调度任务并重新挂载新子树。
 */
function rerenderComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  renderJob: () => void,
): void {
  /* 依次保证 teardown → renderJob → remount 的同步顺序。 */
  teardownMountedSubtree(instance)
  renderJob()
  mountLatestSubtree(instance, options)
}

/**
 * 移除当前缓存的宿主节点，防止重复保留旧 DOM。
 */
function teardownMountedSubtree<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  if (!instance.mountedHandle) {
    return
  }

  instance.mountedHandle.teardown()
  instance.mountedHandle = undefined
}

/**
 * 将最新的子树结果重新挂载回容器并记录。
 */
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

  instance.mountedHandle = mounted
}

/**
 * 释放组件实例，确保子树、 effect 与自定义清理任务全部执行。
 */
function teardownComponentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  teardownMountedSubtree(instance)
  instance.effect.stop()

  if (instance.cleanupCallbacks.length > 0) {
    const tasks = [...instance.cleanupCallbacks]

    instance.cleanupCallbacks = []

    /* 逐一运行外部注册的清理逻辑，避免引用泄漏。 */
    for (const task of tasks) {
      task()
    }
  }
}

/**
 * 将实例回写到 virtualNode，方便测试或调试阶段访问。
 */
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
    /** 收集到的组件实例，方便调试或测试检索。 */
    componentInstance?: ComponentInstance<
      HostNode,
      HostElement,
      HostFragment,
      T
    >
  }

  ;(virtualNode as VirtualNodeWithInstance).componentInstance = instance
}
