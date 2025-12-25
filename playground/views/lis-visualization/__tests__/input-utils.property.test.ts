/**
 * LIS 算法可视化 - 输入处理工具函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证输入处理函数的正确性。
 */

import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import {
  parseInput,
  deduplicateInput,
  normalizeSequence,
  generateRandomSequence,
} from '../utils/input-utils.ts'

/**
 * 生成有效的输入数组（只包含 -1 和非负整数）
 */
const validInputArbitrary = fc.array(
  fc.oneof(fc.constant(-1), fc.integer({ min: 0, max: 100 })),
  { minLength: 0, maxLength: 30 },
)

/**
 * 生成无重复的非负整数数组（用于测试归一化）
 */
const uniqueNonNegativeArbitrary = fc
  .uniqueArray(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 30 })
  .map((arr) => {
    // 随机插入一些 -1
    const result: number[] = []

    for (const n of arr) {
      if (Math.random() < 0.1) {
        result.push(-1)
      }

      result.push(n)
    }

    return result
  })

describe('input-utils 属性测试', () => {
  /**
   * Feature: lis-components-refactor, Property 3: parseInput 解析往返一致性
   * Validates: Requirements 3.5, 3.6
   *
   * 对于任意有效的数字数组（只包含 -1 和非负整数），
   * 将其格式化为逗号分隔的字符串后再解析，应该得到相同的数组。
   */
  test.prop([validInputArbitrary], { numRuns: 100 })(
    'Property 3: parseInput 解析往返一致性',
    (numbers) => {
      // 先去重，因为 parseInput 内部会调用 deduplicateInput
      const deduplicated = deduplicateInput(numbers)

      // 格式化为逗号分隔的字符串
      const formatted = deduplicated.join(', ')

      // 解析
      const result = parseInput(formatted)

      // 应该成功
      expect(result.success).toBe(true)

      if (result.success) {
        // 解析结果应该与原数组相同
        expect(result.data).toEqual(deduplicated)
      }
    },
  )

  /**
   * Feature: lis-components-refactor, Property 4: deduplicateInput 保持首次出现
   * Validates: Requirements 3.7
   *
   * 对于任意数字数组：
   * - 输出长度等于输入长度
   * - 每个唯一非 -1 值的首次出现位置被保留
   * - 同一值的后续出现被替换为 -1
   */
  test.prop([validInputArbitrary], { numRuns: 100 })(
    'Property 4: deduplicateInput 保持首次出现',
    (numbers) => {
      const result = deduplicateInput(numbers)

      // 输出长度等于输入长度
      expect(result.length).toBe(numbers.length)

      // 记录每个值的首次出现位置
      const firstOccurrence = new Map<number, number>()

      for (let i = 0; i < numbers.length; i += 1) {
        const value = numbers[i]

        if (value !== -1 && !firstOccurrence.has(value)) {
          firstOccurrence.set(value, i)
        }
      }

      // 验证首次出现位置被保留
      for (const [value, index] of firstOccurrence) {
        expect(result[index]).toBe(value)
      }

      // 验证后续出现被替换为 -1
      const seen = new Set<number>()

      for (let i = 0; i < numbers.length; i += 1) {
        const originalValue = numbers[i]

        if (originalValue === -1) {
          // -1 保持不变
          expect(result[i]).toBe(-1)
        } else if (seen.has(originalValue)) {
          // 重复值应该被替换为 -1
          expect(result[i]).toBe(-1)
        } else {
          // 首次出现应该保留原值
          expect(result[i]).toBe(originalValue)
          seen.add(originalValue)
        }
      }
    },
  )

  /**
   * Feature: lis-components-refactor, Property 5: normalizeSequence 映射为连续整数
   * Validates: Requirements 3.8
   *
   * 对于任意数字数组：
   * - 所有 -1 值保持为 -1
   * - 所有非 -1 值被映射为从 0 开始的连续整数
   * - 原始值的相对大小顺序被保留
   */
  test.prop([uniqueNonNegativeArbitrary], { numRuns: 100 })(
    'Property 5: normalizeSequence 映射为连续整数',
    (numbers) => {
      const result = normalizeSequence(numbers)

      // 输出长度等于输入长度
      expect(result.length).toBe(numbers.length)

      // 收集非 -1 的值
      const nonNegativeOnes = numbers.filter((n) => n !== -1)
      const resultNonNegativeOnes = result.filter((n) => n !== -1)

      // -1 的数量应该相同
      const negativeOneCount = numbers.filter((n) => n === -1).length
      const resultNegativeOneCount = result.filter((n) => n === -1).length

      expect(resultNegativeOneCount).toBe(negativeOneCount)

      // 非 -1 值应该是从 0 到 n-1 的连续整数
      const sortedResult = [...resultNonNegativeOnes].sort((a, b) => a - b)
      const expected = Array.from({ length: nonNegativeOnes.length }, (_, i) => i)

      expect(sortedResult).toEqual(expected)

      // 验证相对大小顺序被保留
      for (let i = 0; i < numbers.length; i += 1) {
        for (let j = i + 1; j < numbers.length; j += 1) {
          const vi = numbers[i]
          const vj = numbers[j]
          const ri = result[i]
          const rj = result[j]

          // 跳过 -1
          if (vi === -1 || vj === -1) {
            continue
          }

          // 原始值的大小关系应该与归一化后的值相同
          if (vi < vj) {
            expect(ri).toBeLessThan(rj)
          } else if (vi > vj) {
            expect(ri).toBeGreaterThan(rj)
          } else {
            expect(ri).toBe(rj)
          }
        }
      }
    },
  )

  /**
   * Feature: lis-components-refactor, Property 6: generateRandomSequence 返回有效归一化序列
   * Validates: Requirements 3.9
   *
   * 对于任意调用 generateRandomSequence：
   * - 返回的数组只包含 -1 和非负整数
   * - 非 -1 值形成从 0 到 n-1 的连续序列（n 是非 -1 值的数量）
   * - 非 -1 值没有重复
   */
  test.prop([fc.constant(undefined)], { numRuns: 100 })(
    'Property 6: generateRandomSequence 返回有效归一化序列',
    () => {
      const result = generateRandomSequence()

      // 长度应该在 8-15 之间
      expect(result.length).toBeGreaterThanOrEqual(8)
      expect(result.length).toBeLessThanOrEqual(15)

      // 所有值应该是 -1 或非负整数
      for (const value of result) {
        expect(value).toBeGreaterThanOrEqual(-1)
        expect(Number.isInteger(value)).toBe(true)
      }

      // 收集非 -1 的值
      const nonNegativeOnes = result.filter((n) => n !== -1)

      // 非 -1 值应该没有重复
      const uniqueNonNegativeOnes = new Set(nonNegativeOnes)

      expect(uniqueNonNegativeOnes.size).toBe(nonNegativeOnes.length)

      // 非 -1 值应该是从 0 到 n-1 的连续整数
      const sorted = [...nonNegativeOnes].sort((a, b) => a - b)
      const expected = Array.from({ length: nonNegativeOnes.length }, (_, i) => i)

      expect(sorted).toEqual(expected)
    },
  )

  /**
   * 边界情况：空字符串解析
   */
  test.prop([fc.constant('')], { numRuns: 10 })('parseInput 对空字符串返回空数组', (input) => {
    const result = parseInput(input)

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data).toEqual([])
    }
  })

  /**
   * 边界情况：空数组去重
   */
  test.prop([fc.constant([] as number[])], { numRuns: 10 })(
    'deduplicateInput 对空数组返回空数组',
    (input) => {
      const result = deduplicateInput(input)

      expect(result).toEqual([])
    },
  )

  /**
   * 边界情况：空数组归一化
   */
  test.prop([fc.constant([] as number[])], { numRuns: 10 })(
    'normalizeSequence 对空数组返回空数组',
    (input) => {
      const result = normalizeSequence(input)

      expect(result).toEqual([])
    },
  )
})
