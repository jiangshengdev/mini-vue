import { createJSXNode, Fragment, h } from './shared.ts'
import type { ElementProps, ElementType, VNode } from '@/jsx/vnode'

export { Fragment, h }

export function jsx<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VNode<T> {
  return createJSXNode(type, props, key)
}

export const jsxs = jsx

export function jsxDEV<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VNode<T> {
  return createJSXNode(type, props, key)
}
