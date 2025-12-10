/**
 * `virtualNode` 工厂与类型的聚合导出入口。
 */
export { createVirtualNode, Fragment } from './factory.ts'
export { isVirtualNode } from './guards.ts'
export type {
  ComponentChildren,
  ElementProps,
  ElementType,
  FragmentProps,
  FragmentType,
  RenderFunction,
  RenderOutput,
  SetupComponent,
  VirtualNode,
  VirtualNodeChild,
} from './types.ts'
export { virtualNodeFlag } from './constants.ts'
