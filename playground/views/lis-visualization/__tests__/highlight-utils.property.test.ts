/**
 * LIS 算法可视化 - 高亮工具函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证高亮函数的纯函数性。
 */

import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import type { StepAction } from '../types.ts'
import {
  computeHighlightState,
  computePredChangeIndicator,
  computePredecessorHighlight,
  getHighlightClass,
  getNodeClassName,
  getSecondaryHighlightClass,
  getSeqChangeIndicator,
} from '../utils/highlight-utils.ts'

/**
 * 生成随机的 StepAction
 */
const stepActionArbitrary: fc.Arbitrary<StepAction | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant({ type: 'init' } as const),
  fc.record({
    type: fc.constant('append' as const),
    index: fc.integer({ min: 0, max: 100 }),
  }),
  fc.record({
    type: fc.constant('replace' as const),
    position: fc.integer({ min: 0, max: 100 }),
    index: fc.integer({ min: 0, max: 100 }),
  }),
  fc.record({
    type: fc.constant('skip' as const),
    index: fc.integer({ min: 0, max: 100 }),
  }),
)

/**
 * 模拟的 CSS 模块样式对象
 */
const mockStyles: Record<string, string> = {
  highlightAppend: 'highlight-append',
  highlightReplace: 'highlight-replace',
  highlightSkip: 'highlight-skip',
  highlightSecondaryAppend: 'highlight-secondary-append',
  highlightSecondaryReplace: 'highlight-secondary-replace',
  chainNode: 'chain-node',
  chainNodeTailHighlight: 'chain-node-tail-highlight',
  chainNodeChangedSecondaryAppend: 'chain-node-changed-secondary-append',
  chainNodeChangedSecondaryReplace: 'chain-node-changed-secondary-replace',
}

/**
 * 生成随机的 sequence 数组
 */
const sequenceArbitrary = fc.array(fc.integer({ min: 0, max: 100 }), {
  minLength: 0,
  maxLength: 20,
})

/**
 * 生成随机的 predecessors 数组
 */
const predecessorsArbitrary = fc.array(fc.integer({ min: -1, max: 100 }), {
  minLength: 0,
  maxLength: 20,
})

describe('highlight-utils 属性测试', () => {
  /**
   * Feature: lis-components-refactor, Property 7: 高亮函数纯函数性
   * Validates: Requirements 5.5, 5.6
   *
   * 对于任意 action 输入，多次调用同一高亮函数应该返回相同的结果。
   */
  test.prop([stepActionArbitrary], { numRuns: 100 })(
    'Property 7: getHighlightClass 纯函数性',
    (action) => {
      const result1 = getHighlightClass(action, mockStyles)
      const result2 = getHighlightClass(action, mockStyles)
      const result3 = getHighlightClass(action, mockStyles)

      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    },
  )

  test.prop([stepActionArbitrary], { numRuns: 100 })(
    'Property 7: getSecondaryHighlightClass 纯函数性',
    (action) => {
      const result1 = getSecondaryHighlightClass(action, mockStyles)
      const result2 = getSecondaryHighlightClass(action, mockStyles)
      const result3 = getSecondaryHighlightClass(action, mockStyles)

      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    },
  )

  test.prop([stepActionArbitrary, fc.boolean()], { numRuns: 100 })(
    'Property 7: getSeqChangeIndicator 纯函数性',
    (action, hasPrevious) => {
      const result1 = getSeqChangeIndicator(action, hasPrevious)
      const result2 = getSeqChangeIndicator(action, hasPrevious)
      const result3 = getSeqChangeIndicator(action, hasPrevious)

      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    },
  )

  test.prop([stepActionArbitrary, sequenceArbitrary], { numRuns: 100 })(
    'Property 7: computeHighlightState 纯函数性',
    (action, sequence) => {
      const result1 = computeHighlightState(action, sequence)
      const result2 = computeHighlightState(action, sequence)
      const result3 = computeHighlightState(action, sequence)

      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
    },
  )

  test.prop([fc.integer({ min: -1, max: 100 }), predecessorsArbitrary, stepActionArbitrary], {
    numRuns: 100,
  })(
    'Property 7: computePredecessorHighlight 纯函数性',
    (highlightPredIndex, predecessors, action) => {
      const result1 = computePredecessorHighlight(highlightPredIndex, predecessors, action)
      const result2 = computePredecessorHighlight(highlightPredIndex, predecessors, action)
      const result3 = computePredecessorHighlight(highlightPredIndex, predecessors, action)

      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
    },
  )

  test.prop(
    [
      fc.boolean(),
      fc.option(predecessorsArbitrary, { nil: undefined }),
      fc.integer({ min: -1, max: 100 }),
      predecessorsArbitrary,
    ],
    { numRuns: 100 },
  )(
    'Property 7: computePredChangeIndicator 纯函数性',
    (hasPrevious, previousPredecessors, highlightPredIndex, predecessors) => {
      const result1 = computePredChangeIndicator(
        hasPrevious,
        previousPredecessors,
        highlightPredIndex,
        predecessors,
      )
      const result2 = computePredChangeIndicator(
        hasPrevious,
        previousPredecessors,
        highlightPredIndex,
        predecessors,
      )
      const result3 = computePredChangeIndicator(
        hasPrevious,
        previousPredecessors,
        highlightPredIndex,
        predecessors,
      )

      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    },
  )

  test.prop(
    [
      fc.record({
        isChainTailHighlight: fc.boolean(),
        isHighlightNode: fc.boolean(),
        isChangedNode: fc.boolean(),
        actionType: fc.option(
          fc.oneof(
            fc.constant('init' as const),
            fc.constant('append' as const),
            fc.constant('replace' as const),
            fc.constant('skip' as const),
          ),
          { nil: undefined },
        ),
        highlightClass: fc.string(),
      }),
    ],
    { numRuns: 100 },
  )('Property 7: getNodeClassName 纯函数性', (options) => {
    const result1 = getNodeClassName(options, mockStyles)
    const result2 = getNodeClassName(options, mockStyles)
    const result3 = getNodeClassName(options, mockStyles)

    expect(result1).toBe(result2)
    expect(result2).toBe(result3)
  })

  /**
   * 验证 getHighlightClass 返回正确的类名
   */
  test.prop([stepActionArbitrary], { numRuns: 100 })(
    'getHighlightClass 返回有效的类名',
    (action) => {
      const result = getHighlightClass(action, mockStyles)

      // 结果应该是空字符串或 mockStyles 中的值之一
      const validClasses = [
        '',
        mockStyles.highlightAppend,
        mockStyles.highlightReplace,
        mockStyles.highlightSkip,
      ]

      expect(validClasses).toContain(result)
    },
  )

  /**
   * 验证 getSecondaryHighlightClass 返回正确的类名
   */
  test.prop([stepActionArbitrary], { numRuns: 100 })(
    'getSecondaryHighlightClass 返回有效的类名',
    (action) => {
      const result = getSecondaryHighlightClass(action, mockStyles)

      // 结果应该是空字符串或 mockStyles 中的值之一
      const validClasses = [
        '',
        mockStyles.highlightSecondaryAppend,
        mockStyles.highlightSecondaryReplace,
      ]

      expect(validClasses).toContain(result)
    },
  )

  /**
   * 验证 computeHighlightState 返回有效的状态
   */
  test.prop([stepActionArbitrary, sequenceArbitrary], { numRuns: 100 })(
    'computeHighlightState 返回有效的状态',
    (action, sequence) => {
      const result = computeHighlightState(action, sequence)

      // 所有位置应该是 -1 或有效索引
      expect(result.highlightSeqPosition).toBeGreaterThanOrEqual(-1)
      expect(result.highlightPredIndex).toBeGreaterThanOrEqual(-1)
      expect(result.previousHighlightSeqPosition).toBeGreaterThanOrEqual(-1)

      // 对于 append 操作，highlightSeqPosition 应该是 sequence.length - 1
      if (action?.type === 'append' && sequence.length > 0) {
        expect(result.highlightSeqPosition).toBe(sequence.length - 1)
      }

      // 对于 replace 操作，highlightSeqPosition 应该等于 action.position
      if (action?.type === 'replace') {
        expect(result.highlightSeqPosition).toBe(action.position)
        expect(result.previousHighlightSeqPosition).toBe(action.position)
      }
    },
  )
})
