/**
 * `jsx-foundation` 对外入口：导出 `virtualNode` 类型、工厂函数与运行时标识。
 *
 * @remarks
 * `jsx-runtime` 依赖这里构建 JSX 的运行时表示。
 */
export { Comment, Text, virtualNodeFlag } from './constants.ts'
export {
  createCommentVirtualNode,
  createTextVirtualNode,
  createVirtualNode,
  Fragment,
} from './factory.ts'
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
