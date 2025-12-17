/**
 * 组件实例的共享定义与当前实例管理工具。
 */
import type { AppContext } from '../create-app.ts'
import type { MountedHandle } from '../mount'
import type {
  ElementProps,
  RenderFunction,
  SetupComponent,
  VirtualNode,
} from '@/jsx-foundation/index.ts'
import type { EffectScope, ReactiveEffect } from '@/reactivity/index.ts'
import type { PlainObject } from '@/shared/index.ts'
import { ContextStack } from '@/shared/index.ts'

/**
 * 组件实例的依赖注入容器类型。
 *
 * @remarks
 * - 运行期使用“对象 + 原型链”表达层级 provides。
 * - key 支持 `symbol`（推荐）与 `string`。
 */
export type Provides = PlainObject

/**
 * 运行期组件实例结构，统一记录渲染与清理状态。
 */
export interface ComponentInstance<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
> {
  /** 父组件实例引用，用于依赖注入与上下文继承。 */
  parent?: UnknownComponentInstance
  /** 应用级上下文（root provides 等），沿组件树结构稳定传播。 */
  appContext?: AppContext
  /** 依赖注入容器，默认通过原型链继承父/应用级 provides。 */
  provides: Provides
  /** 组件定义本身，保存以便多次渲染重用。 */
  readonly type: T
  /** 宿主容器或片段引用，挂载子树时作为根。 */
  readonly container: HostElement | HostFragment
  /** 组件接收到的 props 副本。 */
  props: ElementProps<T>
  /** `setup` 返回的渲染闭包，每次 effect 执行都会调用。 */
  render: RenderFunction
  /** 组件独立的响应式副作用，驱动更新调度。 */
  effect?: ReactiveEffect<VirtualNode | undefined>
  /** 组件级 effect scope，托管所有 setup 内部副作用。 */
  scope: EffectScope
  /** 最近一次渲染生成的虚拟子树结果。 */
  subTree?: VirtualNode
  /** 当前挂载到宿主的节点句柄，支持 teardown。 */
  mountedHandle?: MountedHandle<HostNode>
  /** 组件在父容器中的锚点节点，用于保持兄弟顺序。 */
  anchor?: HostNode
  /** 是否需要为组件维护锚点以保序。 */
  shouldUseAnchor: boolean
  /** 注册的外部清理任务，在卸载时逐一执行。 */
  cleanupTasks: Array<() => void>
  /** `setup` 暴露的状态对象，供模板或渲染函数读取。 */
  setupState?: PlainObject
  /** 组合式 API 使用的上下文容器。 */
  setupContext: PlainObject
}

/** 兼容任意宿主类型的组件实例别名，简化当前实例管理。 */
export type UnknownComponentInstance = ComponentInstance<unknown, WeakKey, unknown, SetupComponent>

/** 当前 setup 调用栈正在处理的实例引用。 */
const instanceStack = new ContextStack<UnknownComponentInstance>()

/**
 * 设置当前运行中的组件实例，供 setup 期间访问。
 */
export function setCurrentInstance<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  instanceStack.push(instance as UnknownComponentInstance)
}

/**
 * 清空当前实例引用，避免泄漏。
 */
export function unsetCurrentInstance(): void {
  instanceStack.pop()
}

/**
 * 读取当前组件实例，仅供内部组合式能力使用。
 */
export function getCurrentInstance(): UnknownComponentInstance | undefined {
  return instanceStack.current
}
