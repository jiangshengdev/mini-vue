/**
 * JSX 对外入口，仅聚合虚拟节点工厂与相关类型。
 */
export { createVNode, Fragment, isVNode } from './vnode/index.ts'
export type {
  ComponentChildren,
  ComponentResult,
  ComponentType,
  ElementProps,
  ElementType,
  FragmentProps,
  FragmentType,
  VNode,
  VNodeChild,
} from './vnode/index.ts'
export { vnodeSymbol } from './vnode/index.ts'
