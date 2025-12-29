/**
 * `jsx-foundation` 模块的聚合导出入口。
 *
 * 本模块提供 `virtualNode` 的核心抽象，包括：
 * - 类型定义（`VirtualNode`、`ElementType`、`ComponentChildren` 等）
 * - 工厂函数（`createVirtualNode`、`createTextVirtualNode`、`Fragment`）
 * - 类型守卫（`isVirtualNode`）
 * - 常量标识（`virtualNodeFlag`、`Text`）
 *
 * 上层 `jsx-runtime` 模块依赖本模块构建 JSX 转换后的运行时表示。
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
