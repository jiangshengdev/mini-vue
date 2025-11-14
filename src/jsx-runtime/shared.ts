import type {
  ElementProps,
  ElementType,
  VNode,
  VNodeChild,
} from '../jsx/vnode.ts'
import { createVNode, Fragment } from '../jsx/vnode.ts'

export { Fragment }

export function createJSXNode<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VNode<T> {
  return createVNode({ type, rawProps: props ?? null, key })
}

export function h<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  ...children: VNodeChild[]
) {
  const normalizedProps = {
    ...(props ?? ({} as ElementProps<T>)),
    children,
  } as ElementProps<T>
  return createJSXNode(type, normalizedProps)
}
