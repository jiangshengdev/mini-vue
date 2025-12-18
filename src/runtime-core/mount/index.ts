/**
 * Runtime-core 挂载子域出口：提供将 `RenderOutput`/`VirtualNode` 挂载为宿主节点的入口函数集合。
 */
export { mountChild } from './child.ts'
export { mountChildren } from './children.ts'
export { mountElement } from './element.ts'
export type { MountedHandle } from './handle.ts'
export { mountVirtualNode } from './virtual-node.ts'
