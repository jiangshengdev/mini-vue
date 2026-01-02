/**
 * 测试辅助：判断指定 key 是否已创建依赖桶。
 *
 * @remarks
 * 仅供测试观测内部依赖收集状态，避免测试用例直接依赖内部模块路径。
 */
import { __hasDependencyBucket as hasDependencyBucket } from '../internals/operations.ts'

/**
 * 判断指定 key 是否已创建依赖桶，供测试验证内部行为。
 *
 * @param args - 透传的目标对象与属性键
 * @returns 存在依赖桶时为 `true`
 */
export function __hasDependencyBucket(...args: Parameters<typeof hasDependencyBucket>): boolean {
  return hasDependencyBucket(...args)
}
