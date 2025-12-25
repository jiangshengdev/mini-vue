/**
 * LIS 算法可视化 - Chain 工具函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证 chain 构建函数的正确性。
 */

import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { buildAllChains, buildChain } from '../utils/chain-utils.ts'

/**
 * 生成有效的 predecessors 数组
 *
 * 规则：
 * - predecessors[i] 必须是 -1 或小于 i 的非负整数
 * - 这确保了不会有循环引用，且链总是向前追溯
 */
const validPredecessorsArbitrary = fc
  .array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 50 })
  .map((array) => {
    // 将数组转换为有效的 predecessors 数组
    return array.map((_, index) => {
      if (index === 0) {
        // 第一个元素必须是 -1（根节点）
        return -1
      }

      // 随机选择 -1 或 [0, index-1] 范围内的值
      const rand = Math.random()

      if (rand < 0.3) {
        return -1 // 30% 概率是根节点
      }

      return Math.floor(Math.random() * index)
    })
  })

describe('chain-utils 属性测试', () => {
  /**
   * Feature: lis-components-refactor, Property 1: buildChain 返回完整的前驱链
   * Validates: Requirements 2.3
   *
   * 对于任意有效的 predecessors 数组和有效的 startIndex：
   * - 返回的链以根节点（predecessor 为 -1）开始
   * - 返回的链以 startIndex 结束
   * - 链中每对相邻节点 (chain[i], chain[i+1]) 满足 predecessors[chain[i+1]] === chain[i]
   */
  test.prop([validPredecessorsArbitrary], { numRuns: 100 })(
    'Property 1: buildChain 返回完整的前驱链',
    (predecessors) => {
      // 随机选择一个有效的 startIndex
      const startIndex = Math.floor(Math.random() * predecessors.length)
      const chain = buildChain(startIndex, predecessors)

      // 链不应为空（至少包含 startIndex 本身）
      expect(chain.length).toBeGreaterThan(0)

      // 链的最后一个元素应该是 startIndex
      expect(chain.at(-1)).toBe(startIndex)

      // 链的第一个元素的 predecessor 应该是 -1（根节点）
      expect(predecessors[chain[0]]).toBe(-1)

      // 验证链的连续性：每对相邻节点满足前驱关系
      for (let i = 0; i < chain.length - 1; i += 1) {
        const currentNode = chain[i]
        const nextNode = chain[i + 1]

        expect(predecessors[nextNode]).toBe(currentNode)
      }
    },
  )

  /**
   * Feature: lis-components-refactor, Property 2: buildAllChains 返回正确数量的链
   * Validates: Requirements 2.4
   *
   * 对于任意 sequence 数组和 predecessors 数组：
   * - 返回的 chains 数组长度等于 sequence.length
   * - 每条链 chains[i] 以 sequence[i] 结尾
   */
  test.prop([validPredecessorsArbitrary], { numRuns: 100 })(
    'Property 2: buildAllChains 返回正确数量的链',
    (predecessors) => {
      // 生成有效的 sequence（索引在 predecessors 范围内）
      const sequenceLength = Math.floor(Math.random() * Math.min(predecessors.length, 10)) + 1
      const sequence: number[] = []

      for (let i = 0; i < sequenceLength; i += 1) {
        sequence.push(Math.floor(Math.random() * predecessors.length))
      }

      const chains = buildAllChains(sequence, predecessors)

      // 链的数量应该等于 sequence 的长度
      expect(chains.length).toBe(sequence.length)

      // 每条链应该以对应的 sequence 元素结尾
      for (const [i, chain] of chains.entries()) {
        const expectedEnd = sequence[i]

        expect(chain.length).toBeGreaterThan(0)
        expect(chain.at(-1)).toBe(expectedEnd)
      }
    },
  )

  /**
   * 边界情况：空 predecessors 数组
   */
  test.prop([fc.constant([] as number[])], { numRuns: 10 })(
    'buildChain 对空 predecessors 返回空数组',
    (predecessors) => {
      const chain = buildChain(0, predecessors)

      expect(chain).toEqual([])
    },
  )

  /**
   * 边界情况：无效的 startIndex
   */
  test.prop([validPredecessorsArbitrary], { numRuns: 100 })(
    'buildChain 对无效 startIndex 返回空数组',
    (predecessors) => {
      // 负数索引
      expect(buildChain(-1, predecessors)).toEqual([])

      // 超出范围的索引
      expect(buildChain(predecessors.length, predecessors)).toEqual([])
      expect(buildChain(predecessors.length + 100, predecessors)).toEqual([])
    },
  )

  /**
   * 边界情况：空 sequence
   */
  test.prop([validPredecessorsArbitrary], { numRuns: 100 })(
    'buildAllChains 对空 sequence 返回空数组',
    (predecessors) => {
      const chains = buildAllChains([], predecessors)

      expect(chains).toEqual([])
    },
  )
})
