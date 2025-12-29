/**
 * Runtime-core patch 子域出口：基于 normalize 后的 `virtualNode` 进行单节点与 `children` 的更新。
 */
export { patchChild } from './child.ts'
export type { PatchEnvironment } from './children.ts'
export { patchChildren } from './children.ts'
export { createPatchDriver } from './driver.ts'
export { mountChildInEnvironment } from './insertion.ts'
export { computeLongestIncreasingSubsequence } from './longest-increasing-subsequence.ts'
export { getHostNodesSafely } from './runtime-virtual-node.ts'
export { getFirstHostNode, getLastHostNode, getNextHostNode, move } from './utils.ts'
