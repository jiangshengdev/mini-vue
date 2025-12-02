import type { RendererOptions } from '../renderer.ts'
import { mountChild } from './mount-child.ts'
import type { MountedHandle } from './mounted-handle.ts'
import type {
  ComponentRenderFunction,
  ComponentResult,
  ComponentType,
  ElementProps,
  VirtualNode,
} from '@/jsx/index.ts'
import { isVirtualNode } from '@/jsx/index.ts'
import type { ComponentInstance } from '@/runtime-core/component-instance.ts'
import {
  setCurrentInstance,
  unsetCurrentInstance,
} from '@/runtime-core/component-instance.ts'
import { ReactiveEffect } from '@/reactivity/effect.ts'
import { isPlainObject } from '@/shared/utils.ts'

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
  const instance = createComponentInstance(component, props, container)

  attachInstanceToVirtualNode(virtualNode, instance)
  setupComponent(instance)

  const mounted = performInitialRender(instance, options)

  return {
    nodes: mounted?.nodes ?? [],
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
  component: T,
  props: ElementProps<T>,
  container: HostElement | HostFragment,
): ComponentInstance<HostNode, HostElement, HostFragment, T> {
  return {
    type: component,
    container,
    props,
    render: () => undefined,
    cleanupCallbacks: [],
    ctx: {},
  }
}

/**
 * 初始化组件，创建 setup 阶段与渲染闭包。
 */
function setupComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  instance.render = createSetupRenderInvoker(instance)
}

function createSetupRenderInvoker<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): ComponentRenderFunction {
  let initialized = false
  let finalizedRender: ComponentRenderFunction | undefined

  const legacyRender: ComponentRenderFunction = () =>
    instance.type(instance.props)

  return function renderWithSetup(): ComponentResult {
    if (initialized) {
      return finalizedRender ? finalizedRender() : legacyRender()
    }

    initialized = true

    setCurrentInstance(instance)
    const setupResult = instance.type(instance.props)

    unsetCurrentInstance()

    if (isRenderFunction(setupResult)) {
      instance.render = setupResult
      finalizedRender = setupResult

      return setupResult()
    }

    recordSetupState(instance, setupResult)
    instance.render = legacyRender
    finalizedRender = legacyRender

    return setupResult
  }
}

function isRenderFunction(
  value: ComponentResult | ComponentRenderFunction,
): value is ComponentRenderFunction {
  return typeof value === 'function'
}

function recordSetupState<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  setupResult: ComponentResult,
): void {
  if (instance.setupState) {
    return
  }

  if (shouldPersistSetupState(setupResult)) {
    instance.setupState = setupResult
  }
}

function shouldPersistSetupState(
  value: unknown,
): value is Record<string, unknown> {
  return isPlainObject(value) && !isVirtualNode(value)
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
  instance.effect = createRenderEffect(instance, options)
  const subtree = instance.effect.run()
  const mounted = mountChild(options, subtree, instance.container)

  instance.mountedHandle = mounted

  return mounted
}

function createRenderEffect<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): ReactiveEffect<ComponentResult> {
  return new ReactiveEffect<ComponentResult>(
    () => {
      const subtree = instance.render()

      instance.subTree = subtree

      return subtree
    },
    (renderJob) => {
      rerenderComponent(instance, options, renderJob)
    },
  )
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
  instance.effect?.stop()
  instance.effect = undefined

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
