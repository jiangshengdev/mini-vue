import { normalizeChildren } from './children.ts'
import type {
  ComponentChildren,
  ElementProps,
  ElementType,
  FragmentProps,
  VNode,
  VNodeChild,
} from './types.ts'
import { vnodeFlag } from './types.ts'

/**
 * JSX 片段组件，不创建额外节点，直接返回 children。
 */
export function Fragment(props: FragmentProps): ComponentChildren {
  return props.children ?? null
}

/**
 * createVNode 所需的参数结构，描述 type、原始 props 与 key。
 */
interface VNodeInitOptions<T extends ElementType> {
  type: T
  rawProps?: ElementProps<T> | null
  key?: PropertyKey
}

/**
 * 根据传入的类型与 props 创建标准化的 VNode 节点。
 */
export function createVNode<T extends ElementType>(
  options: VNodeInitOptions<T>,
): VNode<T> {
  const { type, rawProps = null, key } = options
  /* 复制一份 props，避免外部对象在后续流程中被意外修改 */
  let props: Record<string, unknown> | null = rawProps ? { ...rawProps } : null
  let children: VNodeChild[] = []

  if (props && 'children' in props) {
    /* 将 props.children 归一化为内部统一使用的 children 数组 */
    const normalizedChildren = normalizeChildren(props.children)

    /* children 从 props 中移除，避免与 children 数组重复保存 */
    delete props.children
    children = normalizedChildren

    if (Reflect.ownKeys(props).length === 0) {
      props = null
    }
  }

  return {
    /* 使用唯一标记区分普通对象与内部 VNode 结构 */
    [vnodeFlag]: true as const,
    type,
    props: (props as ElementProps<T> | null) ?? null,
    children,
    key,
  }
}
