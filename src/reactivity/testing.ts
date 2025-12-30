/**
 * Reactivity 测试辅助出口。
 *
 * @remarks
 * - 该文件仅用于测试观测内部状态，不保证对外 API 稳定性。
 * - 为避免测试直接 import 内部模块路径，通过 `index.ts` 统一转发这些能力。
 */
export { __hasDependencyBucket } from './internals/operations.ts'
