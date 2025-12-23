/**
 * LIS 算法可视化 - 追踪函数
 */

import type { TraceResult } from './types'

/**
 * 追踪 LIS 算法执行过程，返回完整的可视化数据。
 *
 * @param indexes - 输入数组（新偏移 -> 旧索引映射）
 * @returns 包含所有步骤和最终结果的追踪数据
 */
export function traceLIS(indexes: number[]): TraceResult {
  // TODO: 实现追踪逻辑
  return {
    input: indexes,
    steps: [],
    result: [],
  }
}
