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
import {
  runtimeErrorContexts,
  runtimeErrorHandlerPhases,
  runtimeErrorPropagationStrategies,
  runWithErrorChannel,
} from '@/shared/runtime-error-channel.ts'

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
  hasNextSibling: boolean,
): MountedHandle<HostNode> | undefined {
  /* 准备实例前先规整 props，以免 setup 阶段读到旧引用。 */
  const props = resolveComponentProps(virtualNode)
  const instance = createComponentInstance(component, props, container, hasNextSibling)

  /* 让 virtualNode 拥有实例引用，方便调试或测试检索。 */
  attachInstanceToVirtualNode(virtualNode, instance)
  setupComponent(instance)

  /* 执行首次渲染并将子树挂载到宿主容器。 */
  const mounted = performInitialRender(instance, options)

  return {
    nodes: (mounted?.nodes ?? []) as HostNode[],
    teardown(): void {
      teardownComponentInstance(instance, options)
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
  const emptyProps: ElementProps<T> = Object.create(null) as ElementProps<T>
  const props: ElementProps<T> = virtualNode.props ? { ...virtualNode.props } : emptyProps
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
  needsAnchor: boolean,
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
    anchor: undefined,
    needsAnchor,
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
    return runWithErrorChannel(
      () => {
        return instance.type(instance.props)
      },
      {
        origin: runtimeErrorContexts.componentSetup,
        handlerPhase: runtimeErrorHandlerPhases.sync,
        propagate: runtimeErrorPropagationStrategies.sync,
        beforeRun() {
          /* 替换全局 currentInstance 以便 setup 内部通过 API 访问自身。 */
          setCurrentInstance(instance)
        },
        afterRun() {
          unsetCurrentInstance()
        },
      },
    )
  })

  if (!render) {
    throw new TypeError('组件作用域已失效，无法执行 setup', { cause: instance.scope })
  }

  if (typeof render !== 'function') {
    throw new TypeError('组件必须返回渲染函数以托管本地状态', { cause: render })
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
  return runWithErrorChannel(
    () => {
      const subtree = instance.effect!.run()
      /* 子树由通用 mountChild 继续挂载到宿主容器。 */
      const mounted = mountChildWithAnchor(instance, options, subtree)

      instance.mountedHandle = mounted

      return mounted
    },
    {
      origin: runtimeErrorContexts.effectRunner,
      handlerPhase: runtimeErrorHandlerPhases.sync,
      propagate: runtimeErrorPropagationStrategies.sync,
      afterRun(token) {
        if (token?.error) {
          teardownComponentInstance(instance, options)
        }
      },
    },
  )
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
  runWithErrorChannel(renderSchedulerJob, {
    origin: runtimeErrorContexts.scheduler,
    handlerPhase: runtimeErrorHandlerPhases.sync,
    propagate: runtimeErrorPropagationStrategies.sync,
  })
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
  const mounted = mountChildWithAnchor(instance, options, instance.subTree)

  instance.mountedHandle = mounted
}

function mountChildWithAnchor<
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
    return mountChild(options, child, instance.container)
  }

  ensureComponentAnchor(instance, options)

  if (!instance.anchor) {
    return mountChild(options, child, instance.container)
  }

  const fragment = options.createFragment()
  const mounted = mountChild(options, child, fragment)

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

/**
 * 释放组件实例，确保子树、 effect 与自定义清理任务全部执行。
 */
function teardownComponentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): void {
  teardownMountedSubtree(instance)

  if (instance.anchor) {
    options.remove(instance.anchor)
    instance.anchor = undefined
  }

  /* 停止 scope 以统一回收所有 setup 内创建的副作用。 */
  instance.scope.stop()
  instance.effect = undefined

  if (instance.cleanupTasks.length > 0) {
    /* 复制任务队列，避免执行过程中新增清理项造成死循环。 */
    const tasks = [...instance.cleanupTasks]

    instance.cleanupTasks = []

    /* 逐一运行外部注册的清理逻辑，避免引用泄漏。 */
    for (const task of tasks) {
      runWithErrorChannel(task, {
        origin: runtimeErrorContexts.componentCleanup,
        handlerPhase: runtimeErrorHandlerPhases.sync,
        propagate: runtimeErrorPropagationStrategies.silent,
      })
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
