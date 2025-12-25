import type { ElementProps, SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { shallowReactive, shallowReadonly } from '@/reactivity/index.ts'

/**
 * 规整组件 `props`，并根据 `children` 数量注入合适的 `children` 形态。
 *
 * @remarks
 * - 克隆 `props` 以防止组件在运行期写回 `virtualNode`。
 * - 单个 `children` 直接给值，多个 `children` 传数组，与 JSX 约定保持一致。
 */
export function resolveComponentProps<T extends SetupComponent>(
  virtualNode: VirtualNode<T>,
): ElementProps<T> {
  /* 克隆 `props`，防止函数组件在运行期写回 `virtualNode`。 */
  const emptyProps: ElementProps<T> = Object.create(null) as ElementProps<T>
  const props: ElementProps<T> = virtualNode.props ? { ...virtualNode.props } : emptyProps
  const childCount = virtualNode.children.length

  /* 保持 `JSX` 约定：单个 `children` 直接给值，多个 `children` 传数组。 */
  if (childCount === 1) {
    props.children = virtualNode.children[0]
  } else if (childCount > 1) {
    props.children = virtualNode.children
  }

  return props
}

/**
 * 组件 `props` 的响应式状态容器。
 *
 * @remarks
 * - `propsSource`：浅响应式源对象，允许内部同步更新。
 * - `props`：只读代理，暴露给 `setup` 使用，防止组件内部意外修改。
 */
export interface ComponentPropsState<T extends SetupComponent> {
  /** 只读代理，供 `setup` 读取 `props`。 */
  props: ElementProps<T>
  /** 浅响应式源对象，供内部同步更新 `props`。 */
  propsSource: ElementProps<T>
}

/**
 * 为组件创建独立的浅响应式 `props` 容器，并暴露只读代理给 `setup`。
 *
 * @remarks
 * - 使用 `shallowReactive` 而非 `reactive`：只追踪顶层属性变更，避免深层响应式带来的性能开销。
 * - 使用 `shallowReadonly` 包装：防止 `setup` 内部意外修改 `props`。
 */
export function createComponentPropsState<T extends SetupComponent>(
  resolvedProps: ElementProps<T>,
): ComponentPropsState<T> {
  const propsSource = shallowReactive(resolvedProps)
  const props = shallowReadonly(resolvedProps) as ElementProps<T>

  return { props, propsSource }
}
