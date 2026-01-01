/**
 * 组件实例的共享定义与当前实例管理工具。
 */
import type { AppContext } from '../create-app.ts'
import type { MountedHandle } from '../mount'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { SchedulerJob } from '../scheduler.ts'
import type { RuntimeVirtualNode } from '../virtual-node.ts'
import type { KeepAliveContext } from '../components/keep-alive-context.ts'
import type { ElementProps, RenderFunction, SetupComponent } from '@/jsx-foundation/index.ts'
import type { EffectScope, ReactiveEffect } from '@/reactivity/index.ts'
import type { PlainObject } from '@/shared/index.ts'
import { ContextStack } from '@/shared/index.ts'

/** 组件生命周期钩子的函数签名（当前仅支持同步函数）。 */
export type LifecycleHook = () => void

/**
 * 组件实例的依赖注入容器类型。
 *
 * @remarks
 * - 运行期使用「对象 + 原型链」表达层级 `provides`，子组件可沿原型链读取祖先提供的值。
 * - `key` 支持 `symbol`（推荐，避免命名冲突）与 `string`。
 */
export type Provides = PlainObject

/**
 * 运行期组件实例结构，统一记录渲染与清理状态。
 *
 * @remarks
 * - 每个组件实例持有独立的 `effect`/`scope`，负责跟踪依赖并调度重渲染。
 * - `provides` 通过原型链继承父组件/应用级依赖，实现层级注入。
 * - `mountedHandle` 记录当前挂载到宿主的节点句柄，支持 `teardown` 清理。
 */
export interface ComponentInstance<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
> {
  /** 组件唯一 id，用于 scheduler 排序与调试（对齐 Vue3 uid）。 */
  uid: number
  /**
   * 组件树的 post-order 序号，用于 post flush 生命周期的稳定父子顺序。
   *
   * @remarks
   * - 在「挂载完成」时分配，保证子组件先于父组件（子 → 父）。
   * - 用于对齐 Vue3 对 mounted/updated/unmounted 的父子顺序关键保证点。
   */
  postOrderId: number
  /** 父组件实例引用，用于依赖注入与上下文继承。 */
  parent?: UnknownComponentInstance
  /** 应用级上下文（root `provides` 等），沿组件树结构稳定传播。 */
  appContext?: AppContext
  /** 若当前组件为 `KeepAlive`，记录其实例上下文。 */
  keepAliveContext?: KeepAliveContext<HostNode, HostElement, HostFragment>
  /** 依赖注入容器，默认通过原型链继承父/应用级 `provides`。 */
  provides: Provides
  /** 组件定义本身（即 `setup` 函数），保存以便多次渲染重用。 */
  readonly type: T
  /** 组件名称（来自函数名），仅用于调试/标注场景。 */
  readonly componentName?: string
  /** 宿主容器或片段引用，挂载子树时作为根。 */
  container: HostElement | HostFragment
  /** 组件接收到的只读 `props` 代理。 */
  props: ElementProps<T>
  /** 允许内部同步的浅响应式 `props` 源对象。 */
  propsSource: ElementProps<T>
  /** `setup` 返回的渲染闭包，每次 `effect` 执行都会调用以获取最新子树。 */
  render: RenderFunction
  /** 组件独立的响应式副作用，驱动更新调度。 */
  effect?: ReactiveEffect<NormalizedVirtualNode | undefined>
  /** 组件级 `effect scope`，托管所有 `setup` 内部创建的副作用。 */
  scope: EffectScope
  /** 最近一次渲染生成的虚拟子树结果。 */
  subTree?: NormalizedVirtualNode
  /**
   * 当前组件对应的运行时 vnode 引用，用于同步 `el`/`anchor` 等宿主元数据。
   *
   * @remarks
   * - 组件更新时 vnode 对象会被新建并替换，因此需要在 `mount/patch` 时刷新该引用。
   * - 仅用于维护运行时元数据一致性，不参与对外 API。
   */
  virtualNode?: RuntimeVirtualNode<HostNode, HostElement, HostFragment>
  /** 当前挂载到宿主的节点句柄，支持 `teardown` 清理。 */
  mountedHandle?: MountedHandle<HostNode>
  /**
   * 组件自身对应的 vnode 句柄（用于 `children diff` 的移动/卸载）。
   *
   * @remarks
   * - 组件重渲染时需要同步 `nodes`，否则父级重排会移动到「已卸载的旧节点」，导致 DOM 被错误复活。
   * - 该句柄由 `mountComponent` 创建并回写，生命周期与组件 vnode 保持一致。
   */
  vnodeHandle?: MountedHandle<HostNode>
  /** 注册的外部清理任务，在卸载时逐一执行。 */
  cleanupTasks: Array<() => void>
  /** `setup` 暴露的状态对象，供模板或渲染函数读取。 */
  setupState?: PlainObject
  /** 组合式 API 使用的上下文容器。 */
  setupContext: PlainObject
  /** 组件是否已完成首轮挂载（用于区分 mount/update 语义）。 */
  isMounted: boolean
  /** 组件是否已完成卸载（用于过期防护与跳过重复调度）。 */
  isUnmounted: boolean
  /** 组件是否处于 `KeepAlive` 失活状态。 */
  isDeactivated: boolean
  /** `onMounted` 注册的回调（按注册顺序执行）。 */
  mountedHooks: LifecycleHook[]
  /** `onUnmounted` 注册的回调（按注册顺序执行）。 */
  unmountedHooks: LifecycleHook[]
  /** `onActivated` 注册的回调（按注册顺序执行）。 */
  activatedHooks: LifecycleHook[]
  /** `onDeactivated` 注册的回调（按注册顺序执行）。 */
  deactivatedHooks: LifecycleHook[]
  /** `onBeforeUpdate` 注册的回调（按注册顺序执行）。 */
  beforeUpdateHooks: LifecycleHook[]
  /** `onUpdated` 注册的回调（按注册顺序执行）。 */
  updatedHooks: LifecycleHook[]
  /** `onMounted` 对应的 post 队列 job（用于过期防护）。 */
  mountedHookJob?: SchedulerJob
  /** `onActivated` 对应的 post 队列 job。 */
  activatedHookJob?: SchedulerJob
  /** `onUpdated` 对应的 post 队列 job（用于去重与过期防护）。 */
  updatedHookJob?: SchedulerJob
  /** `onUnmounted` 对应的 post 队列 job（用于去重）。 */
  unmountedHookJob?: SchedulerJob
  /** `onDeactivated` 对应的 post 队列 job。 */
  deactivatedHookJob?: SchedulerJob
}

/** 兼容任意宿主类型的组件实例别名，简化当前实例管理与跨模块传递。 */
export type UnknownComponentInstance = ComponentInstance<unknown, WeakKey, unknown, SetupComponent>

export type CurrentInstanceScope = 'setup' | 'hook'

interface CurrentInstanceContext {
  readonly instance: UnknownComponentInstance
  readonly scope: CurrentInstanceScope
}

/** 当前调用栈正在处理的实例引用，支持嵌套组件的 setup/hook 上下文。 */
const instanceStack = new ContextStack<CurrentInstanceContext>()

/**
 * 设置当前运行中的组件实例，供 `setup` 期间通过 `getCurrentInstance()` 访问。
 *
 * @remarks
 * - 在 `setup` 开始前调用，结束后需配对调用 `unsetCurrentInstance()`。
 * - 支持嵌套：内层组件 `setup` 会暂时覆盖外层实例。
 */
export function setCurrentInstance<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  instanceStack.push({ instance: instance as UnknownComponentInstance, scope: 'setup' })
}

/**
 * 设置当前运行中的组件实例，供生命周期钩子执行期间通过 `getCurrentInstance()` 访问。
 *
 * @remarks
 * - 与 Vue3 行为对齐：hook 执行期间同样暴露 currentInstance，便于高级用法读取实例上下文。
 * - setup-only API 需自行通过 `getCurrentSetupInstance()` 做时机校验。
 */
export function setCurrentInstanceForHook<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  instanceStack.push({ instance: instance as UnknownComponentInstance, scope: 'hook' })
}

/**
 * 清空当前实例引用，恢复到上一层（若存在），避免泄漏。
 *
 * @remarks
 * 必须与 `setCurrentInstance` 配对调用，否则会导致后续组件读取到错误的实例。
 */
export function unsetCurrentInstance(): void {
  instanceStack.pop()
}

/**
 * 读取当前组件实例，仅供内部组合式能力使用。
 *
 * @remarks
 * - 在 `setup()` 与生命周期钩子执行期间返回有效实例。
 * - 在组件外部调用（如模块顶层、事件回调、异步任务）会返回 `undefined`。
 */
export function getCurrentInstance(): UnknownComponentInstance | undefined {
  return instanceStack.current?.instance
}

/**
 * 读取当前实例所在的上下文类型。
 *
 * @remarks
 * - 主要用于实现「setup-only API」在 hook 执行期的告警/报错分流。
 */
export function getCurrentInstanceScope(): CurrentInstanceScope | undefined {
  return instanceStack.current?.scope
}

/**
 * 仅在 `setup()` 执行期间读取当前实例（setup-only API 使用）。
 */
export function getCurrentSetupInstance(): UnknownComponentInstance | undefined {
  const { current } = instanceStack

  return current?.scope === 'setup' ? current.instance : undefined
}
