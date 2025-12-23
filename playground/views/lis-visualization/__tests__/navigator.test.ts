/**
 * LIS 算法可视化 - 步骤导航器单元测试
 */

import { describe, expect, it } from 'vitest'
import { createStepNavigator } from '../navigator.ts'
import type { TraceResult, VisualizationStep } from '../types.ts'

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
      predecessors: Array.from({ length: stepCount }, () => {
        return -1
      }),
    })
  }

  return {
    input: Array.from({ length: stepCount }, (_, i) => {
      return i
    }),
    steps,
    result: [0],
  }
}

describe('createStepNavigator', () => {
  describe('getState', () => {
    it('应该返回正确的初始状态', () => {
      const trace = createMockTrace(5)
      const navigator = createStepNavigator(trace)
      const state = navigator.getState()

      expect(state.currentStep).toBe(0)
      expect(state.totalSteps).toBe(5)
      expect(state.canGoBack).toBe(false)
      expect(state.canGoForward).toBe(true)
    })

    it('空步骤列表时应该返回正确状态', () => {
      const trace = createMockTrace(0)
      const navigator = createStepNavigator(trace)
      const state = navigator.getState()

      expect(state.currentStep).toBe(0)
      expect(state.totalSteps).toBe(0)
      expect(state.canGoBack).toBe(false)
      expect(state.canGoForward).toBe(false)
    })

    it('单步骤时应该返回正确状态', () => {
      const trace = createMockTrace(1)
      const navigator = createStepNavigator(trace)
      const state = navigator.getState()

      expect(state.currentStep).toBe(0)
      expect(state.totalSteps).toBe(1)
      expect(state.canGoBack).toBe(false)
      expect(state.canGoForward).toBe(false)
    })
  })

  describe('getCurrentStep', () => {
    it('应该返回当前步骤数据', () => {
      const trace = createMockTrace(3)
      const navigator = createStepNavigator(trace)
      const step = navigator.getCurrentStep()

      expect(step).not.toBeNull()
      expect(step?.stepIndex).toBe(0)
    })

    it('空步骤列表时应该返回 null', () => {
      const trace = createMockTrace(0)
      const navigator = createStepNavigator(trace)
      const step = navigator.getCurrentStep()

      expect(step).toBeNull()
    })
  })

  describe('next', () => {
    it('应该前进到下一步并返回步骤数据', () => {
      const trace = createMockTrace(3)
      const navigator = createStepNavigator(trace)

      const step = navigator.next()

      expect(step).not.toBeNull()
      expect(step?.stepIndex).toBe(1)
      expect(navigator.getState().currentStep).toBe(1)
    })

    it('在最后一步时应该返回 null 且不改变状态', () => {
      const trace = createMockTrace(2)
      const navigator = createStepNavigator(trace)

      navigator.goTo(1) // 跳转到最后一步
      const step = navigator.next()

      expect(step).toBeNull()
      expect(navigator.getState().currentStep).toBe(1)
    })
  })

  describe('prev', () => {
    it('应该后退到上一步并返回步骤数据', () => {
      const trace = createMockTrace(3)
      const navigator = createStepNavigator(trace)

      navigator.goTo(2) // 先跳转到最后
      const step = navigator.prev()

      expect(step).not.toBeNull()
      expect(step?.stepIndex).toBe(1)
      expect(navigator.getState().currentStep).toBe(1)
    })

    it('在第一步时应该返回 null 且不改变状态', () => {
      const trace = createMockTrace(3)
      const navigator = createStepNavigator(trace)

      const step = navigator.prev()

      expect(step).toBeNull()
      expect(navigator.getState().currentStep).toBe(0)
    })
  })

  describe('goTo', () => {
    it('应该跳转到指定步骤并返回步骤数据', () => {
      const trace = createMockTrace(5)
      const navigator = createStepNavigator(trace)

      const step = navigator.goTo(3)

      expect(step).not.toBeNull()
      expect(step?.stepIndex).toBe(3)
      expect(navigator.getState().currentStep).toBe(3)
    })

    it('无效索引（负数）时应该返回 null 且不改变状态', () => {
      const trace = createMockTrace(3)
      const navigator = createStepNavigator(trace)

      navigator.goTo(1)
      const step = navigator.goTo(-1)

      expect(step).toBeNull()
      expect(navigator.getState().currentStep).toBe(1)
    })

    it('无效索引（超出范围）时应该返回 null 且不改变状态', () => {
      const trace = createMockTrace(3)
      const navigator = createStepNavigator(trace)

      navigator.goTo(1)
      const step = navigator.goTo(10)

      expect(step).toBeNull()
      expect(navigator.getState().currentStep).toBe(1)
    })
  })

  describe('reset', () => {
    it('应该重置到初始状态（步骤 0）', () => {
      const trace = createMockTrace(5)
      const navigator = createStepNavigator(trace)

      navigator.goTo(3)
      navigator.reset()

      expect(navigator.getState().currentStep).toBe(0)
    })
  })

  describe('边界状态指示', () => {
    it('在第一步时 canGoBack 应该为 false', () => {
      const trace = createMockTrace(5)
      const navigator = createStepNavigator(trace)

      expect(navigator.getState().canGoBack).toBe(false)
    })

    it('在最后一步时 canGoForward 应该为 false', () => {
      const trace = createMockTrace(5)
      const navigator = createStepNavigator(trace)

      navigator.goTo(4)

      expect(navigator.getState().canGoForward).toBe(false)
    })

    it('在中间步骤时 canGoBack 和 canGoForward 都应该为 true', () => {
      const trace = createMockTrace(5)
      const navigator = createStepNavigator(trace)

      navigator.goTo(2)
      const state = navigator.getState()

      expect(state.canGoBack).toBe(true)
      expect(state.canGoForward).toBe(true)
    })
  })
})
