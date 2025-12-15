/**
 * 响应式数组能力的聚合出口。
 *
 * @remarks
 * - 单独抽成子模块，避免在响应式核心处理器里堆叠过多数组细节。
 * - 当前仅导出“需要无依赖收集的数组变更方法”及其 key 判断工具。
 */
export { arrayUntrackedMutators, isArrayMutatorKey } from './mutators.ts'

/**
 * 数组的 identity-sensitive 查询方法（includes/indexOf/lastIndexOf）需要特殊处理。
 */
export { arraySearchInstrumentations, isArraySearchKey } from './search.ts'
