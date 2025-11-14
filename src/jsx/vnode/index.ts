/**
 * VNode 工厂与类型的聚合导出入口。
 */
export { createVNode, Fragment } from './factory.ts'
export { isVNode } from './guards.ts'
export type {
  ComponentChildren,
  ComponentType,
  ComponentResult,
  ElementProps,
  ElementType,
  FragmentProps,
  FragmentType,
  VNode,
  VNodeChild,
} from './types.ts'
export { vnodeSymbol } from './types.ts'
