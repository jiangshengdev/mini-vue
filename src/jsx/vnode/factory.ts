import { normalizeChildren } from './children.ts'
import type {
  ElementProps,
  ElementType,
  FragmentProps,
  VNode,
  VNodeChild,
} from './types.ts'
import { vnodeSymbol } from './types.ts'

export function Fragment(
  props: FragmentProps,
): VNodeChild | VNodeChild[] | null {
  return (
    (props.children as VNodeChild | VNodeChild[] | null | undefined) ?? null
  )
}

interface CreateVNodeOptions<T extends ElementType> {
  type: T
  rawProps?: ElementProps<T> | null
  key?: PropertyKey
}

export function createVNode<T extends ElementType>(
  options: CreateVNodeOptions<T>,
): VNode<T> {
  const { type, rawProps = null, key } = options
  let props: Record<string, unknown> | null = rawProps
    ? { ...(rawProps as object) }
    : null
  let children: VNodeChild[] = []

  if (props && 'children' in props) {
    const normalized = normalizeChildren(props.children)
    delete props.children
    children = normalized
    if (Object.keys(props).length === 0) {
      props = null
    }
  }

  return {
    __v_isVNode: vnodeSymbol,
    type,
    props: (props as ElementProps<T> | null) ?? null,
    children,
    key,
  }
}
