/**
 * 测试辅助：用于判断指定 key 是否已创建依赖桶。
 *
 * @remarks
 * 该文件仅面向测试使用，避免测试用例直接依赖内部模块路径。
 */
import { __hasDependencyBucket as hasDependencyBucket } from '../internals/operations.ts'

/**
 * 判断指定 key 是否已创建依赖桶，供测试验证内部行为。
 *
 * @param args - 透传给内部实现的参数：目标对象与属性键
 * @returns 若对应依赖桶已存在则返回 `true`
 */
export function __hasDependencyBucket(...args: Parameters<typeof hasDependencyBucket>): boolean {
  return hasDependencyBucket(...args)
}
