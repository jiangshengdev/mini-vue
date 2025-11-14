import { Fragment, createVNode } from '../jsx/vnode.ts'
import type { ElementType, VNode } from '../jsx/vnode.ts'

interface JSXRuntimeProps {
  children?: unknown
  [key: string]: unknown
}

export { Fragment }

export function createJSXNode(
  type: ElementType,
  props: JSXRuntimeProps = {},
  key?: PropertyKey,
): VNode {
  return createVNode({ type, rawProps: props, key })
}

export function h(
  type: ElementType,
  props: JSXRuntimeProps = {},
  ...children: unknown[]
) {
  const normalizedProps = { ...props, children }
  return createJSXNode(type, normalizedProps)
}
