/**
 * Runtime-core 挂载子域出口：聚合子节点/元素的挂载与虚拟节点分派能力。
 *
 * - 只暴露通用入口，不承担渲染实现细节，便于宿主渲染器隔离。
 * - 入口签名保持与其他子域一致，方便测试与复用。
 */
export { mountChild } from './child.ts'
export { mountElementChildren } from './children.ts'
export { mountElement } from './element.ts'
export type { MountedHandle } from './handle.ts'
export { mountVirtualNode } from './virtual-node.ts'
