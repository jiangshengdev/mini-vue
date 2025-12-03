import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mount-child.ts'
import type { MountedHandle } from './mounted-handle.ts'
import type {
  ComponentRenderFunction,
  ComponentResult,
  ElementProps,
  SetupFunctionComponent,
  VirtualNode,
} from '@/jsx/index.ts'
import type { ComponentInstance } from '@/runtime-core/component-instance.ts'
import { setCurrentInstance, unsetCurrentInstance } from '@/runtime-core/component-instance.ts'
import { ReactiveEffect } from '@/reactivity/effect.ts'
import { effectScope, recordEffectScope } from '@/reactivity/effect-scope.ts'
import { handleMiniError } from '@/shared/error-handling.ts'

/**
 * 执行函数组件并将返回的子树继续挂载到容器。
 */
export function mountComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  component: T,
  virtualNode: VirtualNode<T>,
  container: HostElement | HostFragment,
): MountedHandle<HostNode> | undefined {
  /* 准备实例前先规整 props，以免 setup 阶段读到旧引用。 */
  const props = resolveComponentProps(virtualNode)
  const instance = createComponentInstance(component, props, container)

  /* 让 virtualNode 拥有实例引用，方便调试或测试检索。 */
  attachInstanceToVirtualNode(virtualNode, instance)
  setupComponent(instance)

  /* 执行首次渲染并将子树挂载到宿主容器。 */
  const mounted = performInitialRender(instance, options)

  return {
    nodes: (mounted?.nodes ?? []) as HostNode[],
    teardown(): void {
      teardownComponentInstance(instance)
    },
  }
}

/**
 * 规整组件 props，并根据 children 数量注入合适的 children 形态。
 */
function resolveComponentProps<T extends SetupFunctionComponent>(
  virtualNode: VirtualNode<T>,
): ElementProps<T> {
  /* 克隆 props，防止函数组件在运行期写回 virtualNode。 */
  const props = (virtualNode.props ? { ...virtualNode.props } : {}) as ElementProps<T>
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
  T extends SetupFunctionComponent,
>(
  component: T,
  props: ElementProps<T>,
  container: HostElement | HostFragment,
): ComponentInstance<HostNode, HostElement, HostFragment, T> {
  /* `render`/`effect` 初始为空，由 setup 与 performInitialRender 回填。 */
  return {
    type: component,
    container,
    props,
    render() {
      return undefined
    },
    cleanupTasks: [],
    setupContext: {},
    scope: effectScope(true),
  }
}

/**
 * 初始化组件，创建 setup 阶段与渲染闭包。
 */
function setupComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  /* `setup` 返回的渲染闭包会成为 effect 调度的核心逻辑。 */
  instance.render = invokeSetup(instance)
}

function invokeSetup<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): ComponentRenderFunction {
  const render = instance.scope.run(() => {
    /* 替换全局 currentInstance 以便 setup 内部通过 API 访问自身。 */
    setCurrentInstance(instance)

    try {
      return instance.type(instance.props)
    } finally {
      unsetCurrentInstance()
    }
  })

  if (!render) {
    throw new TypeError('组件作用域已失效，无法执行 setup')
  }

  if (typeof render !== 'function') {
    throw new TypeError('组件必须返回渲染函数以托管本地状态')
  }

  /* 始终返回函数，供 effect 每次执行时拿到最新子树。 */
  return render
}

/**
 * 运行组件 effect 并将首个结果挂载到容器。
 */
function performInitialRender<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): MountedHandle<HostNode> | undefined {
  /* 每个组件实例持有独立 effect，负责跟踪依赖并调度重渲染。 */
  instance.effect = createRenderEffect(instance, options)
  /* 首次 run() 会同步生成子树结果。 */
  const subtree = instance.effect.run()
  /* 子树由通用 mountChild 继续挂载到宿主容器。 */
  const mounted = mountChild(options, subtree, instance.container)

  instance.mountedHandle = mounted

  return mounted
}

function createRenderEffect<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): ReactiveEffect<ComponentResult> {
  const effect = new ReactiveEffect<ComponentResult>(
    () => {
      /* 每次渲染时记录最新子树，供后续挂载或复用。 */
      const subtree = instance.render()

      instance.subTree = subtree

      return subtree
    },
    (renderSchedulerJob) => {
      /* 调度阶段需要先卸载旧子树，再执行 render 并挂载。 */
      rerenderComponent(instance, options, renderSchedulerJob)
    },
  )

  recordEffectScope(effect, instance.scope)

  return effect
}

/**
 * Rerender 时先卸载旧子树，再运行调度任务并重新挂载新子树。
 */
function rerenderComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  renderSchedulerJob: () => void,
): void {
  /* 依次保证 teardown → renderSchedulerJob → remount 的同步顺序。 */
  teardownMountedSubtree(instance)
  renderSchedulerJob()
  mountLatestSubtree(instance, options)
}

/**
 * 移除当前缓存的宿主节点，防止重复保留旧 DOM。
 */
function teardownMountedSubtree<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  if (!instance.mountedHandle) {
    return
  }

  /* 释放宿主节点引用，旧 DOM 会被宿主实现回收。 */
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
  T extends SetupFunctionComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): void {
  /* 使用缓存的子树结果重新交给宿主挂载。 */
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
  T extends SetupFunctionComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  teardownMountedSubtree(instance)
  /* 停止 scope 以统一回收所有 setup 内创建的副作用。 */
  instance.scope.stop()
  instance.effect = undefined

  if (instance.cleanupTasks.length > 0) {
    /* 复制任务队列，避免执行过程中新增清理项造成死循环。 */
    const tasks = [...instance.cleanupTasks]

    instance.cleanupTasks = []

    /* 逐一运行外部注册的清理逻辑，避免引用泄漏。 */
    for (const task of tasks) {
      try {
        task()
      } catch (error) {
        handleMiniError(error, 'component-cleanup')
      }
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
  T extends SetupFunctionComponent,
>(
  virtualNode: VirtualNode<T>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): void {
  type VirtualNodeWithInstance = VirtualNode<T> & {
    /** 收集到的组件实例，方便调试或测试检索。 */
    componentInstance?: ComponentInstance<HostNode, HostElement, HostFragment, T>
  }

  /* 扩展 virtualNode 类型后写入实例引用，供外部消费。 */
  ;(virtualNode as VirtualNodeWithInstance).componentInstance = instance
}
