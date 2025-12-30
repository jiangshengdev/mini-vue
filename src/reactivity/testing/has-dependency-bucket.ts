/**
 * 测试辅助：用于判断指定 key 是否已创建依赖桶。
 *
 * @remarks
 * 该文件仅面向测试使用，避免测试用例直接依赖内部模块路径。
 */
import { __hasDependencyBucket as hasDependencyBucket } from '../internals/operations.ts'

export function __hasDependencyBucket(...args: Parameters<typeof hasDependencyBucket>): boolean {
  return hasDependencyBucket(...args)
}
