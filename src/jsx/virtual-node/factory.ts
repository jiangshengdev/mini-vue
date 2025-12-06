import { normalizeChildren } from './children.ts'
import type {
  ComponentChildren,
  ElementProps,
  ElementType,
  FragmentProps,
  VirtualNode,
  VirtualNodeChild,
} from '@/jsx/index.ts'
import { virtualNodeFlag } from '@/jsx/index.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * JSX 片段组件，不创建额外节点，直接返回 children。
 *
 * @public
 */
export function Fragment(props: FragmentProps): ComponentChildren {
  return props.children
}

/**
 * `createVirtualNode` 所需的参数结构，描述 type、原始 props 与 key。
 */
interface VirtualNodeInitOptions<T extends ElementType> {
  type: T
  rawProps?: ElementProps<T>
  key?: PropertyKey
}

/**
 * 根据传入的类型与 props 创建标准化的 virtualNode 节点。
 */
export function createVirtualNode<T extends ElementType>(
  options: VirtualNodeInitOptions<T>,
): VirtualNode<T> {
  const { type, rawProps, key } = options
  /* 通过解构复制 props，避免外部对象在后续流程中被意外修改 */
  let props: PropsShape | undefined
  let children: VirtualNodeChild[] = []

  if (rawProps) {
    const hasChildren = Object.hasOwn(rawProps, 'children')
    const { children: rawChildren, ...restProps } = rawProps as PropsShape & {
      children?: unknown
    }

    if (hasChildren) {
      /* 将 props.children 归一化为内部统一使用的 children 数组 */
      children = normalizeChildren(rawChildren)
    }

    if (Reflect.ownKeys(restProps).length > 0) {
      props = restProps
    }
  }

  return {
    /* 使用唯一标记区分普通对象与内部 virtualNode 结构 */
    [virtualNodeFlag]: true as const,
    type,
    props: props as ElementProps<T> | undefined,
    children,
    key,
  }
}
