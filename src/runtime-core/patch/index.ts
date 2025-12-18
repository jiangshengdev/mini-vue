/**
 * Runtime-core patch 子域出口：基于 normalize 后的 `vnode` 进行单节点与 `children` 的更新。
 */
export { patchChild } from './child.ts'
export { patchChildren } from './children.ts'
export type { PatchEnvironment } from './children.ts'
