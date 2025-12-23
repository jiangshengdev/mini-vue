import { describe, expect, it } from 'vitest'
import { computeLongestIncreasingSubsequence } from '@/runtime-core/index.ts'

/* 仅计算“各长度最小尾值”的辅助函数，用于对比 sequence 与最终 LIS。 */
function computeTailSequence(indexes: number[]): number[] {
  const tails: number[] = []

  for (let currentIndex = 0; currentIndex < indexes.length; currentIndex += 1) {
    const currentValue = indexes[currentIndex]

    if (currentValue === -1) {
      continue
    }

    const lastTailIndex = tails.at(-1)

    if (lastTailIndex === undefined || currentValue > indexes[lastTailIndex]) {
      tails.push(currentIndex)
      continue
    }

    let low = 0
    let high = tails.length - 1

    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      const middleIndex = tails[middle]

      if (indexes[middleIndex] < currentValue) {
        low = middle + 1
      } else {
        high = middle
      }
    }

    if (currentValue < indexes[tails[low]]) {
      tails[low] = currentIndex
    }
  }

  return tails
}

describe('computeLongestIncreasingSubsequence', () => {
  it('LIS 与尾巴序列不同的场景', () => {
    /* 这个输入会触发“尾巴列表”与最终 LIS 不一致。 */
    const indexes = [2, 1, 3, 0, 4]

    const lis = computeLongestIncreasingSubsequence(indexes)
    const tails = computeTailSequence(indexes)

    /* 尾巴序列记录各长度最小尾值位置。 */
    expect(tails).toEqual([3, 2, 4])
    /* 最终 LIS 需要依赖前驱链回溯。 */
    expect(lis).toEqual([1, 2, 4])
    /* 若直接拿尾巴列表当作 LIS，会得出错误结果。 */
    expect(lis).not.toEqual(tails)
  })
})
