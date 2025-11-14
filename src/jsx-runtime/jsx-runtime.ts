import { createJSXNode, Fragment, h } from './shared.ts'
import type { ElementType, VNode } from '../jsx/vnode.ts'

interface JSXRuntimeProps {
  children?: unknown
  [key: string]: unknown
}

export { Fragment, h }

export function jsx(
  type: ElementType,
  props: JSXRuntimeProps = {},
  key?: PropertyKey,
): VNode {
  return createJSXNode(type, props, key)
}

export const jsxs = jsx

export function jsxDEV(
  type: ElementType,
  props: JSXRuntimeProps = {},
  key?: PropertyKey,
): VNode {
  return createJSXNode(type, props, key)
}
