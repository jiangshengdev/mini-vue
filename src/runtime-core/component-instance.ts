/**
 * 组件实例的共享定义与当前实例管理工具。
 */
import type { MountedHandle } from './renderer/mounted-handle.ts'
import type {
  ComponentRenderFunction,
  ComponentResult,
  ElementProps,
  SetupFunctionComponent,
} from '@/jsx/index.ts'
import type { ReactiveEffect } from '@/reactivity/effect.ts'
import type { PlainObject } from '@/shared/types.ts'

/**
 * 运行期组件实例结构，统一记录渲染与清理状态。
 */
export interface ComponentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
> {
  /** 组件定义本身，保存以便多次渲染重用。 */
  readonly type: T
  /** 宿主容器或片段引用，挂载子树时作为根。 */
  readonly container: HostElement | HostFragment
  /** 组件接收到的 props 副本。 */
  readonly props: ElementProps<T>
  /** setup 返回的渲染闭包，每次 effect 执行都会调用。 */
  render: ComponentRenderFunction
  /** 组件独立的响应式副作用，驱动更新调度。 */
  effect?: ReactiveEffect<ComponentResult>
  /** 最近一次渲染生成的虚拟子树结果。 */
  subTree?: ComponentResult
  /** 当前挂载到宿主的节点句柄，支持 teardown。 */
  mountedHandle?: MountedHandle<HostNode>
  /** 注册的外部清理任务，在卸载时逐一执行。 */
  cleanupTasks: Array<() => void>
  /** setup 暴露的状态对象，供模板或渲染函数读取。 */
  setupState?: PlainObject
  /** 组合式 API 使用的上下文容器。 */
  setupContext: PlainObject
}

/** 兼容任意宿主类型的组件实例别名，简化当前实例管理。 */
type AnyComponentInstance = ComponentInstance<
  unknown,
  unknown,
  unknown,
  SetupFunctionComponent
>

/** 当前 setup 调用栈正在处理的实例引用。 */
let currentInstance: AnyComponentInstance | undefined

/**
 * 设置当前运行中的组件实例，供 setup 期间访问。
 */
export function setCurrentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  currentInstance = instance as AnyComponentInstance
}

/**
 * 清空当前实例引用，避免泄漏。
 */
export function unsetCurrentInstance(): void {
  currentInstance = undefined
}

/**
 * 读取当前组件实例，仅供内部组合式能力使用。
 */
export function getCurrentInstance(): AnyComponentInstance | undefined {
  return currentInstance
}
