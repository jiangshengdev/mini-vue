/**
 * JSX 对外入口，仅聚合虚拟节点工厂与相关类型。
 */
export {
  createVirtualNode,
  Fragment,
  isVirtualNode,
} from '@/jsx/virtual-node/index.ts'
export type {
  ComponentChildren,
  ComponentResult,
  ComponentType,
  ElementProps,
  ElementType,
  FragmentProps,
  FragmentType,
  VirtualNode,
  VirtualNodeChild,
} from '@/jsx/virtual-node/index.ts'
export { virtualNodeFlag } from '@/jsx/virtual-node/index.ts'
