/**
 * LIS 算法可视化 - 追踪函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证追踪函数的正确性。
 */

import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { traceLongestIncreasingSubsequence } from '../trace.ts'
import { computeLongestIncreasingSubsequence } from '@/runtime-core/patch/longest-increasing-subsequence.ts'

/**
 * 生成有效的 LIS 输入数组（包含 -1 哨兵值）
 * 模拟 runtime-core 中的实际使用场景
 */
const lisInputArbitrary = fc.array(fc.oneof(fc.integer({ min: 0, max: 100 }), fc.constant(-1)), {
  minLength: 0,
  maxLength: 50,
})

describe('traceLIS 属性测试', () => {
  /**
   * Feature: lis-visualization, Property 1: 追踪结果与原始算法一致
   * Validates: Requirements 3.2, 7.3
   *
   * 对于任意输入数组，traceLIS 返回的 result 应该与
   * computeLongestIncreasingSubsequence 返回的结果完全相同。
   */
  test.prop([lisInputArbitrary], { numRuns: 100 })(
    'Property 1: 追踪结果与原始算法一致',
    (input) => {
      const traceResult = traceLongestIncreasingSubsequence(input)
      const originalResult = computeLongestIncreasingSubsequence(input)

      expect(traceResult.result).toEqual(originalResult)
    },
  )

  /**
   * Feature: lis-visualization, Property 2: 步骤数量等于输入长度加一
   * Validates: Requirements 1.1
   *
   * 对于任意输入数组，追踪结果的步骤数量应该等于输入数组的长度加一。
   * 第 0 步是初始状态，后续每个输入元素都会产生一个对应的步骤。
   */
  test.prop([lisInputArbitrary], { numRuns: 100 })(
    'Property 2: 步骤数量等于输入长度加一',
    (input) => {
      const traceResult = traceLongestIncreasingSubsequence(input)

      expect(traceResult.steps.length).toBe(input.length + 1)
    },
  )

  /**
   * Feature: lis-visualization, Property 3: 操作类型正确性
   * Validates: Requirements 1.2, 1.3, 1.4
   *
   * 对于任意追踪步骤：
   * - 第 0 步的 action.type 应该是 "init"
   * - 当 currentValue === -1 时，action.type 应该是 "skip"
   * - 当值被追加到序列末尾时，action.type 应该是 "append"
   * - 当值替换序列中的位置时，action.type 应该是 "replace"
   */
  test.prop([lisInputArbitrary], { numRuns: 100 })('Property 3: 操作类型正确性', (input) => {
    const traceResult = traceLongestIncreasingSubsequence(input)

    for (const step of traceResult.steps) {
      /* 第 0 步是初始化 */
      if (step.stepIndex === 0) {
        expect(step.action.type).toBe('init')

        continue
      }

      /* 当值为 -1 时，操作类型必须是 skip */
      if (step.currentValue === -1) {
        expect(step.action.type).toBe('skip')
      }

      /* 验证操作类型只能是四种之一 */
      expect(['init', 'append', 'replace', 'skip']).toContain(step.action.type)

      /* 验证 action 中的 index 与 currentIndex 一致 */
      if (step.action.type === 'append' || step.action.type === 'skip') {
        expect(step.action.index).toBe(step.currentIndex)
      } else if (step.action.type === 'replace') {
        expect(step.action.index).toBe(step.currentIndex)
        /* Replace 操作的 position 应该在有效范围内 */
        expect(step.action.position).toBeGreaterThanOrEqual(0)
      }
    }
  })

  /**
   * Feature: lis-visualization, Property 4: 步骤数据完整性
   * Validates: Requirements 1.5, 1.6
   *
   * 对于任意追踪步骤，应该包含有效的 sequence 数组和 predecessors 数组，
   * 且 predecessors 长度与输入一致。
   */
  test.prop([lisInputArbitrary], { numRuns: 100 })('Property 4: 步骤数据完整性', (input) => {
    const traceResult = traceLongestIncreasingSubsequence(input)

    for (const step of traceResult.steps) {
      /* Sequence 应该是有效数组 */
      expect(Array.isArray(step.sequence)).toBe(true)

      /* Predecessors 应该是有效数组，长度与输入一致 */
      expect(Array.isArray(step.predecessors)).toBe(true)
      expect(step.predecessors.length).toBe(input.length)

      /* Sequence 中的索引应该在有效范围内 */
      for (const idx of step.sequence) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(input.length)
      }

      /* Predecessors 中的值应该是 -1 或有效索引 */
      for (const pred of step.predecessors) {
        expect(pred).toBeGreaterThanOrEqual(-1)
        expect(pred).toBeLessThan(input.length)
      }
    }
  })

  /**
   * Feature: lis-visualization, Property 5: 深拷贝隔离
   * Validates: Requirements 2.1, 2.2
   *
   * 对于任意追踪结果，修改一个步骤的 sequence 或 predecessors 数组
   * 不应影响其他步骤的数据。每个步骤的状态快照应该是独立的。
   */
  test.prop([fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 50 })], {
    numRuns: 100,
  })('Property 5: 深拷贝隔离', (input) => {
    const traceResult = traceLongestIncreasingSubsequence(input)

    /* 至少需要两个步骤才能验证隔离性 */
    if (traceResult.steps.length < 2) {
      return
    }

    /* 保存第二个步骤的原始状态 */
    const step1SequenceOriginal = [...traceResult.steps[1].sequence]
    const step1PredecessorsOriginal = [...traceResult.steps[1].predecessors]

    /* 修改第一个步骤的数组 */
    traceResult.steps[0].sequence.push(999)
    traceResult.steps[0].predecessors[0] = 999

    /* 验证第二个步骤的数组未受影响 */
    expect(traceResult.steps[1].sequence).toEqual(step1SequenceOriginal)
    expect(traceResult.steps[1].predecessors).toEqual(step1PredecessorsOriginal)
  })

  /**
   * Feature: lis-visualization, Property 6: 步骤索引和值一致性
   * Validates: Requirements 2.3, 2.4
   *
   * 对于任意追踪步骤（非初始化步骤），currentIndex 应该等于 stepIndex - 1，
   * 且 currentValue 应该等于 input[currentIndex]。
   */
  test.prop([lisInputArbitrary], { numRuns: 100 })('Property 6: 步骤索引和值一致性', (input) => {
    const traceResult = traceLongestIncreasingSubsequence(input)

    for (const step of traceResult.steps) {
      /* 第 0 步是初始化，currentIndex 为 -1 */
      if (step.stepIndex === 0) {
        expect(step.currentIndex).toBe(-1)

        continue
      }

      /* 非初始化步骤：currentIndex 应该等于 stepIndex - 1 */
      expect(step.currentIndex).toBe(step.stepIndex - 1)

      /* CurrentValue 应该等于 input[currentIndex] */
      expect(step.currentValue).toBe(input[step.currentIndex])
    }
  })

  /**
   * Feature: lis-visualization, Property 7: 追踪结果可序列化
   * Validates: Requirements 3.4
   *
   * 对于任意追踪结果，JSON.parse(JSON.stringify(trace)) 应该产生与原始结果等价的对象。
   */
  test.prop([lisInputArbitrary], { numRuns: 100 })('Property 7: 追踪结果可序列化', (input) => {
    const traceResult = traceLongestIncreasingSubsequence(input)

    /* 序列化再反序列化 */
    const serialized = JSON.stringify(traceResult)
    const deserialized = JSON.parse(serialized) as typeof traceResult

    /* 验证结果等价 */
    expect(deserialized).toEqual(traceResult)
  })
})
