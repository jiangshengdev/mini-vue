/**
 * LIS 算法可视化 - Hover 管理器属性测试
 *
 * 使用 fast-check 进行属性测试，验证 Hover 管理器的正确性。
 *
 * Feature: lis-visualization-refactor, Property 2: Hover 状态更新正确性
 * Validates: Requirements 4.2
 */

import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { createHoverManager } from '../controllers/hover-manager.ts'
import { createStateManager } from '../controllers/state-manager.ts'
import type { VisualizationStep } from '../types.ts'

/**
 * 生成有效的输入数组（0-20 个整数）
 */
const inputArrayArbitrary = fc.array(fc.integer({ min: -1000, max: 1000 }), {
  minLength: 0,
  maxLength: 20,
})

/**
 * 生成有效的链索引数组（非负整数）
 */
const chainIndexesArbitrary = fc.array(fc.integer({ min: 0, max: 100 }), {
  minLength: 0,
  maxLength: 10,
})

/**
 * 生成有效的链索引（非负整数）
 */
const chainIndexArbitrary = fc.integer({ min: 0, max: 100 })

describe('HoverManager 属性测试', () => {
  /**
   * Feature: lis-visualization-refactor, Property 2: Hover 状态更新正确性
   * Validates: Requirements 4.2
   *
   * 对于任意链索引列表和链索引，当 handleChainHover(indexes, chainIndex) 被调用后，
   * hoveredChainIndexes 状态应该包含提供的索引列表，
   * hoveredChainInfo 状态应该包含提供的 chainIndex。
   */
  test.prop([inputArrayArbitrary, chainIndexesArbitrary, chainIndexArbitrary], { numRuns: 100 })(
    'Property 2: handleChainHover 正确更新 hover 状态',
    (defaultInput, indexes, chainIndex) => {
      const stateManager = createStateManager(defaultInput)
      const hoverManager = createHoverManager({
        stateManager,
        getCurrentStep() {
          return undefined
        },
      })

      // 调用 handleChainHover
      hoverManager.handleChainHover(indexes, chainIndex)

      // 验证状态更新正确
      const state = stateManager.getState()

      expect(state.hoveredChainIndexes.get()).toEqual(indexes)
      expect(state.hoveredChainInfo.get()).toEqual({ chainIndex })
    },
  )

  test.prop([inputArrayArbitrary, chainIndexesArbitrary, chainIndexArbitrary], { numRuns: 100 })(
    'Property 2: handleChainLeave 正确清空 hover 状态',
    (defaultInput, indexes, chainIndex) => {
      const stateManager = createStateManager(defaultInput)
      const hoverManager = createHoverManager({
        stateManager,
        getCurrentStep() {
          return undefined
        },
      })

      // 先设置 hover 状态
      hoverManager.handleChainHover(indexes, chainIndex)

      // 调用 handleChainLeave
      hoverManager.handleChainLeave()

      // 验证状态被清空
      const state = stateManager.getState()

      expect(state.hoveredChainIndexes.get()).toEqual([])
      expect(state.hoveredChainInfo.get()).toBeUndefined()
    },
  )
})

describe('HoverManager Sequence/Predecessors hover 属性测试', () => {
  /**
   * Feature: lis-visualization-refactor, Property 2: Hover 状态更新正确性
   * Validates: Requirements 4.2
   */
  test.prop([inputArrayArbitrary], { numRuns: 100 })(
    'Property 2: handleSequenceHover/Leave 正确更新状态',
    (defaultInput) => {
      const stateManager = createStateManager(defaultInput)
      const hoverManager = createHoverManager({
        stateManager,
        getCurrentStep() {
          return undefined
        },
      })

      const state = stateManager.getState()

      // 初始状态应该是 false
      expect(state.isSequenceHovered.get()).toBe(false)

      // Hover 进入
      hoverManager.handleSequenceHover()
      expect(state.isSequenceHovered.get()).toBe(true)

      // Hover 离开
      hoverManager.handleSequenceLeave()
      expect(state.isSequenceHovered.get()).toBe(false)
    },
  )

  test.prop([inputArrayArbitrary], { numRuns: 100 })(
    'Property 2: handlePredecessorsHover/Leave 正确更新状态',
    (defaultInput) => {
      const stateManager = createStateManager(defaultInput)
      const hoverManager = createHoverManager({
        stateManager,
        getCurrentStep() {
          return undefined
        },
      })

      const state = stateManager.getState()

      // 初始状态应该是 false
      expect(state.isPredecessorsHovered.get()).toBe(false)

      // Hover 进入
      hoverManager.handlePredecessorsHover()
      expect(state.isPredecessorsHovered.get()).toBe(true)

      // Hover 离开
      hoverManager.handlePredecessorsLeave()
      expect(state.isPredecessorsHovered.get()).toBe(false)
    },
  )
})

describe('HoverManager refreshHoverState 属性测试', () => {
  /**
   * Feature: lis-visualization-refactor, Property 2: Hover 状态更新正确性
   * Validates: Requirements 4.2
   *
   * 当没有 chainInfo 时，refreshHoverState 应该保持现状
   */
  test.prop([inputArrayArbitrary, chainIndexesArbitrary], { numRuns: 100 })(
    'Property 2: refreshHoverState 在无 chainInfo 时保持现状',
    (defaultInput, indexes) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      // 手动设置 hoveredChainIndexes 但不设置 chainInfo
      state.hoveredChainIndexes.set(indexes)

      const hoverManager = createHoverManager({
        stateManager,
        getCurrentStep() {
          return undefined
        },
      })

      // 调用 refreshHoverState
      hoverManager.refreshHoverState()

      // 状态应该保持不变
      expect(state.hoveredChainIndexes.get()).toEqual(indexes)
      expect(state.hoveredChainInfo.get()).toBeUndefined()
    },
  )

  test.prop([inputArrayArbitrary, chainIndexArbitrary], { numRuns: 100 })(
    'Property 2: refreshHoverState 在无 currentStep 时清空状态',
    (defaultInput, chainIndex) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      // 设置 chainInfo
      state.hoveredChainInfo.set({ chainIndex })
      state.hoveredChainIndexes.set([1, 2, 3])

      const hoverManager = createHoverManager({
        stateManager,
        getCurrentStep() {
          return undefined
        }, // 返回 undefined
      })

      // 调用 refreshHoverState
      hoverManager.refreshHoverState()

      // 状态应该被清空
      expect(state.hoveredChainIndexes.get()).toEqual([])
      expect(state.hoveredChainInfo.get()).toBeUndefined()
    },
  )

  /**
   * 生成有效的步骤数据，确保 chainIndex 在 sequence 范围内
   */
  test.prop(
    [
      inputArrayArbitrary,
      fc.integer({ min: 1, max: 10 }), // Sequence 长度
    ],
    { numRuns: 100 },
  )(
    'Property 2: refreshHoverState 在 chainIndex 超出范围时清空状态',
    (defaultInput, sequenceLength) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      // 设置一个超出范围的 chainIndex
      const outOfRangeChainIndex = sequenceLength + 10

      state.hoveredChainInfo.set({ chainIndex: outOfRangeChainIndex })
      state.hoveredChainIndexes.set([1, 2, 3])

      // 创建一个有效的步骤
      const mockStep: VisualizationStep = {
        stepIndex: 0,
        currentIndex: 0,
        currentValue: 0,
        action: { type: 'init' },
        sequence: Array.from({ length: sequenceLength }, (_, i) => {
          return i
        }),
        predecessors: Array.from({ length: sequenceLength }, () => {
          return -1
        }),
      }

      const hoverManager = createHoverManager({
        stateManager,
        getCurrentStep() {
          return mockStep
        },
      })

      // 调用 refreshHoverState
      hoverManager.refreshHoverState()

      // 状态应该被清空，因为 chainIndex 超出范围
      expect(state.hoveredChainIndexes.get()).toEqual([])
      expect(state.hoveredChainInfo.get()).toBeUndefined()
    },
  )
})
