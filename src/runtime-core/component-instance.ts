/**
 * 组件实例的共享定义与当前实例管理工具。
 */
import type { MountedHandle } from './renderer/mounted-handle.ts'
import type {
  ComponentRenderFunction,
  ComponentResult,
  ComponentType,
  ElementProps,
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
  T extends ComponentType,
> {
  readonly type: T
  readonly container: HostElement | HostFragment
  readonly props: ElementProps<T>
  render: ComponentRenderFunction
  effect?: ReactiveEffect<ComponentResult>
  subTree?: ComponentResult
  mountedHandle?: MountedHandle<HostNode>
  cleanupCallbacks: Array<() => void>
  setupState?: PlainObject
  ctx: PlainObject
}

type AnyComponentInstance = ComponentInstance<
  unknown,
  unknown,
  unknown,
  ComponentType
>

let currentInstance: AnyComponentInstance | undefined

/**
 * 设置当前运行中的组件实例，供 setup 期间访问。
 */
export function setCurrentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends ComponentType,
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
