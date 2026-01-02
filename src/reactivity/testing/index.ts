/**
 * Reactivity 测试辅助出口，集中暴露内部观测能力。
 *
 * @remarks
 * 该目录仅用于测试校验内部状态，不承诺稳定 API，并通过单一入口避免测试直接 import 内部路径。
 */
export { __hasDependencyBucket } from './has-dependency-bucket.ts'
