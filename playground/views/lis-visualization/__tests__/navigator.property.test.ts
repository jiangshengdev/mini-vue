/**
 * LIS 算法可视化 - 步骤导航器属性测试
 *
 * 使用 fast-check 进行属性测试，验证导航器的正确性。
 */

import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import { createStepNavigator } from '../navigator'
import type { TraceResult, VisualizationStep } from '../types'

/**
 * 创建测试用的追踪结果
 */
function createMockTrace(stepCount: number): TraceResult {
  const steps: VisualizationStep[] = []

  for (let i = 0; i < stepCount; i++) {
    steps.push({
      stepIndex: i,
      currentIndex: i,
      currentValue: i,
      action: { type: 'append', index: i },
      sequence: [i],
      predecessors: Array.from({ length: stepCount }, () => -1),
    })
  }

  return {
    input: Array.from({ length: stepCount }, (_, i) => i),
    steps,
    result: [0],
  }
}

/**
 * 生成有效的步骤数量（1-50）
 */
const stepCountArbitrary = fc.integer({ min: 1, max: 50 })

/**
 * 生成有效的步骤索引（相对于步骤数量）
 */
const validStepIndexArbitrary = (totalSteps: number) =>
  fc.integer({ min: 0, max: Math.max(0, totalSteps - 1) })

describe('StepNavigator 属性测试', () => {
  /**
   * Feature: lis-visualization, Property 8: 导航操作正确性
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4
   *
   * 对于任意步骤导航器和有效的步骤索引 n：
   * - next() 应该将 currentStep 增加 1（如果不在末尾）
   * - prev() 应该将 currentStep 减少 1（如果不在开头）
   * - goTo(n) 应该将 currentStep 设置为 n
   * - reset() 应该将 currentStep 设置为 0
   */
  test.prop([stepCountArbitrary], { numRuns: 100 })(
    'Property 8: 导航操作正确性 - next() 增加步骤',
    (stepCount) => {
      const trace = createMockTrace(stepCount)
      const navigator = createStepNavigator(trace)

      /* 从第一步开始，连续调用 next() */
      for (let i = 0; i < stepCount - 1; i++) {
        const beforeStep = navigator.getState().currentStep

        navigator.next()
        const afterStep = navigator.getState().currentStep

        expect(afterStep).toBe(beforeStep + 1)
      }

      /* 在最后一步时，next() 不应改变状态 */
      const lastStep = navigator.getState().currentStep

      navigator.next()
      expect(navigator.getState().currentStep).toBe(lastStep)
    },
  )

  test.prop([stepCountArbitrary], { numRuns: 100 })(
    'Property 8: 导航操作正确性 - prev() 减少步骤',
    (stepCount) => {
      const trace = createMockTrace(stepCount)
      const navigator = createStepNavigator(trace)

      /* 先跳转到最后一步 */
      navigator.goTo(stepCount - 1)

      /* 从最后一步开始，连续调用 prev() */
      for (let i = stepCount - 1; i > 0; i--) {
        const beforeStep = navigator.getState().currentStep

        navigator.prev()
        const afterStep = navigator.getState().currentStep

        expect(afterStep).toBe(beforeStep - 1)
      }

      /* 在第一步时，prev() 不应改变状态 */
      const firstStep = navigator.getState().currentStep

      navigator.prev()
      expect(navigator.getState().currentStep).toBe(firstStep)
    },
  )

  test.prop(
    [
      stepCountArbitrary.chain((count) =>
        fc.tuple(fc.constant(count), validStepIndexArbitrary(count)),
      ),
    ],
    { numRuns: 100 },
  )('Property 8: 导航操作正确性 - goTo(n) 设置步骤', ([stepCount, targetStep]) => {
    const trace = createMockTrace(stepCount)
    const navigator = createStepNavigator(trace)

    navigator.goTo(targetStep)

    expect(navigator.getState().currentStep).toBe(targetStep)
  })

  test.prop([stepCountArbitrary], { numRuns: 100 })(
    'Property 8: 导航操作正确性 - reset() 重置到步骤 0',
    (stepCount) => {
      const trace = createMockTrace(stepCount)
      const navigator = createStepNavigator(trace)

      /* 先跳转到随机位置 */
      navigator.goTo(Math.floor(stepCount / 2))

      /* 调用 reset() */
      navigator.reset()

      expect(navigator.getState().currentStep).toBe(0)
    },
  )
})

describe('StepNavigator 边界状态属性测试', () => {
  /**
   * Feature: lis-visualization, Property 9: 边界状态指示
   * Validates: Requirements 4.5, 4.6, 4.7
   *
   * 对于任意步骤导航器：
   * - 当 currentStep === 0 时，canGoBack 应该为 false
   * - 当 currentStep === totalSteps - 1 时，canGoForward 应该为 false
   * - 其他情况下，canGoBack 和 canGoForward 应该为 true
   */
  test.prop([stepCountArbitrary], { numRuns: 100 })(
    'Property 9: 边界状态指示 - 第一步时 canGoBack 为 false',
    (stepCount) => {
      const trace = createMockTrace(stepCount)
      const navigator = createStepNavigator(trace)

      /* 确保在第一步 */
      navigator.reset()
      const state = navigator.getState()

      expect(state.currentStep).toBe(0)
      expect(state.canGoBack).toBe(false)
    },
  )

  test.prop([stepCountArbitrary], { numRuns: 100 })(
    'Property 9: 边界状态指示 - 最后一步时 canGoForward 为 false',
    (stepCount) => {
      const trace = createMockTrace(stepCount)
      const navigator = createStepNavigator(trace)

      /* 跳转到最后一步 */
      navigator.goTo(stepCount - 1)
      const state = navigator.getState()

      expect(state.currentStep).toBe(stepCount - 1)
      expect(state.canGoForward).toBe(false)
    },
  )

  test.prop([fc.integer({ min: 3, max: 50 })], { numRuns: 100 })(
    'Property 9: 边界状态指示 - 中间步骤时两个方向都可用',
    (stepCount) => {
      const trace = createMockTrace(stepCount)
      const navigator = createStepNavigator(trace)

      /* 跳转到中间位置 */
      const middleStep = Math.floor(stepCount / 2)

      navigator.goTo(middleStep)
      const state = navigator.getState()

      /* 中间位置应该两个方向都可以导航 */
      expect(state.canGoBack).toBe(true)
      expect(state.canGoForward).toBe(true)
    },
  )

  test.prop(
    [
      stepCountArbitrary.chain((count) =>
        fc.tuple(fc.constant(count), validStepIndexArbitrary(count)),
      ),
    ],
    { numRuns: 100 },
  )('Property 9: 边界状态指示 - 任意位置的边界状态一致性', ([stepCount, currentStep]) => {
    const trace = createMockTrace(stepCount)
    const navigator = createStepNavigator(trace)

    navigator.goTo(currentStep)
    const state = navigator.getState()

    /* 验证边界状态与当前位置的一致性 */
    expect(state.canGoBack).toBe(currentStep > 0)
    expect(state.canGoForward).toBe(currentStep < stepCount - 1)
    expect(state.totalSteps).toBe(stepCount)
  })
})
