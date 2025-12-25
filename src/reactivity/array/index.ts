/**
 * 响应式数组能力的聚合出口。
 *
 * @remarks
 * - 单独抽成子模块，避免在响应式核心处理器里堆叠过多数组细节。
 * - 导出「需要无依赖收集的数组变更方法」及其 key 判断工具。
 * - 导出「需要特殊处理的数组查询方法」及其 key 判断工具。
 */

/**
 * 数组变更方法的无追踪包装版本及判断工具。
 *
 * @remarks
 * - 变更方法（push/pop/shift 等）内部可能读取 length/索引，这些读取不应被视为用户态依赖。
 */
export { arrayUntrackedMutators, isArrayMutatorKey } from './mutators.ts'

/**
 * 数组的 identity-sensitive 查询方法（includes/indexOf/lastIndexOf）需要特殊处理。
 *
 * @remarks
 * - 这些方法会基于元素做相等性比较，响应式数组的懒代理会导致 raw/proxy 对比失败。
 * - 包装版本会先尝试原始查询，失败后回退到 raw 入参再查一次。
 */
export { arraySearchWrappers, isArraySearchKey } from './search.ts'
