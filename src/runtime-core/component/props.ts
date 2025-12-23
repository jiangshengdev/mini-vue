import type { ElementProps, SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { shallowReadonly, shallowReactive } from '@/reactivity/index.ts'

/**
 * 规整组件 `props`，并根据 `children` 数量注入合适的 `children` 形态。
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
 * 为组件创建独立的浅响应式 props 容器，并暴露只读代理给 `setup`。
 */
export interface ComponentPropsState<T extends SetupComponent> {
  props: ElementProps<T>
  propsSource: ElementProps<T>
}

export function createComponentPropsState<T extends SetupComponent>(
  resolvedProps: ElementProps<T>,
): ComponentPropsState<T> {
  const propsSource = shallowReactive(resolvedProps)
  const props = shallowReadonly(resolvedProps) as ElementProps<T>

  return { props, propsSource }
}
