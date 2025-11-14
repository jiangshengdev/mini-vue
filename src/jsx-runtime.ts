import type { ElementType, VNode } from './jsx/vnode.ts'
import { createVNode, Fragment } from './jsx/vnode.ts'

export { Fragment }

interface JSXRuntimeProps {
  children?: unknown
  [key: string]: unknown
}

export function jsx(
  type: ElementType,
  props: JSXRuntimeProps = {},
  key?: PropertyKey,
): VNode {
  return createVNode({ type, rawProps: props, key })
}

export const jsxs = jsx

export function jsxDEV(
  type: ElementType,
  props: JSXRuntimeProps = {},
  key?: PropertyKey,
): VNode {
  return createVNode({ type, rawProps: props, key })
}

export function h(
  type: ElementType,
  props: JSXRuntimeProps,
  ...children: unknown[]
) {
  const normalizedProps = props ? { ...props, children } : { children }
  return createVNode({ type, rawProps: normalizedProps })
}
