/**
 * LIS 算法可视化 - 状态管理器属性测试
 *
 * 使用 fast-check 进行属性测试，验证状态管理器的正确性。
 *
 * Feature: lis-visualization-refactor, Property 1: 状态设置后获取一致性
 * Validates: Requirements 1.5
 */

import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { createStateManager } from '../controllers/state-manager.ts'

/**
 * 生成有效的输入数组（0-20 个整数）
 */
const inputArrayArbitrary = fc.array(fc.integer({ min: -1000, max: 1000 }), {
  minLength: 0,
  maxLength: 20,
})

/**
 * 生成有效的播放速度（100-2000 毫秒）
 */
const speedArbitrary = fc.integer({ min: 100, max: 2000 })

/**
 * 生成有效的链索引数组
 */
const chainIndexesArbitrary = fc.array(fc.integer({ min: 0, max: 100 }), {
  minLength: 0,
  maxLength: 10,
})

/**
 * 生成有效的链信息
 */
const chainInfoArbitrary = fc.option(fc.record({ chainIndex: fc.integer({ min: 0, max: 100 }) }), {
  nil: undefined,
})

describe('StateManager 属性测试', () => {
  /**
   * Feature: lis-visualization-refactor, Property 1: 状态设置后获取一致性
   * Validates: Requirements 1.5
   *
   * 对于任意状态值，当 set(value) 被调用后，立即调用 get() 应该返回相同的值。
   */
  test.prop([inputArrayArbitrary, inputArrayArbitrary], { numRuns: 100 })(
    'Property 1: input 状态设置后获取一致性',
    (defaultInput, newInput) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      // 设置新值
      state.input.set(newInput)

      // 验证获取的值与设置的值相同
      expect(state.input.get()).toEqual(newInput)
    },
  )

  test.prop([inputArrayArbitrary, fc.boolean()], { numRuns: 100 })(
    'Property 1: isPlaying 状态设置后获取一致性',
    (defaultInput, isPlaying) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      state.isPlaying.set(isPlaying)

      expect(state.isPlaying.get()).toBe(isPlaying)
    },
  )

  test.prop([inputArrayArbitrary, speedArbitrary], { numRuns: 100 })(
    'Property 1: speed 状态设置后获取一致性',
    (defaultInput, speed) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      state.speed.set(speed)

      expect(state.speed.get()).toBe(speed)
    },
  )

  test.prop([inputArrayArbitrary, chainIndexesArbitrary], { numRuns: 100 })(
    'Property 1: hoveredChainIndexes 状态设置后获取一致性',
    (defaultInput, indexes) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      state.hoveredChainIndexes.set(indexes)

      expect(state.hoveredChainIndexes.get()).toEqual(indexes)
    },
  )

  test.prop([inputArrayArbitrary, chainInfoArbitrary], { numRuns: 100 })(
    'Property 1: hoveredChainInfo 状态设置后获取一致性',
    (defaultInput, chainInfo) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      state.hoveredChainInfo.set(chainInfo)

      expect(state.hoveredChainInfo.get()).toEqual(chainInfo)
    },
  )

  test.prop([inputArrayArbitrary, fc.boolean()], { numRuns: 100 })(
    'Property 1: isSequenceHovered 状态设置后获取一致性',
    (defaultInput, isHovered) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      state.isSequenceHovered.set(isHovered)

      expect(state.isSequenceHovered.get()).toBe(isHovered)
    },
  )

  test.prop([inputArrayArbitrary, fc.boolean()], { numRuns: 100 })(
    'Property 1: isPredecessorsHovered 状态设置后获取一致性',
    (defaultInput, isHovered) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      state.isPredecessorsHovered.set(isHovered)

      expect(state.isPredecessorsHovered.get()).toBe(isHovered)
    },
  )

  test.prop([inputArrayArbitrary, fc.integer({ min: 0, max: 1000 })], { numRuns: 100 })(
    'Property 1: navigatorVersion 状态设置后获取一致性',
    (defaultInput, version) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      state.navigatorVersion.set(version)

      expect(state.navigatorVersion.get()).toBe(version)
    },
  )
})

describe('StateManager incrementVersion 属性测试', () => {
  /**
   * Feature: lis-visualization-refactor, Property 1: 状态设置后获取一致性
   * Validates: Requirements 1.5
   *
   * incrementVersion() 应该将 navigatorVersion 增加 1
   */
  test.prop([inputArrayArbitrary, fc.integer({ min: 1, max: 100 })], { numRuns: 100 })(
    'Property 1: incrementVersion 正确增加版本号',
    (defaultInput, incrementCount) => {
      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      const initialVersion = state.navigatorVersion.get()

      // 多次调用 incrementVersion
      for (let i = 0; i < incrementCount; i++) {
        stateManager.incrementVersion()
      }

      expect(state.navigatorVersion.get()).toBe(initialVersion + incrementCount)
    },
  )
})

describe('StateManager resetState 属性测试', () => {
  /**
   * Feature: lis-visualization-refactor, Property 1: 状态设置后获取一致性
   * Validates: Requirements 1.5
   *
   * resetState() 应该将所有状态重置到初始值
   */

  // 将多个 arbitrary 组合成一个 record，避免箭头函数参数过多
  const resetStateArbitrary = fc.record({
    defaultInput: inputArrayArbitrary,
    newInput: inputArrayArbitrary,
    isPlaying: fc.boolean(),
    speed: speedArbitrary,
    chainIndexes: chainIndexesArbitrary,
    chainInfo: chainInfoArbitrary,
    isSequenceHovered: fc.boolean(),
    isPredecessorsHovered: fc.boolean(),
    version: fc.integer({ min: 1, max: 100 }),
  })

  test.prop([resetStateArbitrary], { numRuns: 100 })(
    'Property 1: resetState 正确重置所有状态',
    (properties) => {
      const {
        defaultInput,
        newInput,
        isPlaying,
        speed,
        chainIndexes,
        chainInfo,
        isSequenceHovered,
        isPredecessorsHovered,
        version,
      } = properties

      const stateManager = createStateManager(defaultInput)
      const state = stateManager.getState()

      // 修改所有状态
      state.input.set(newInput)
      state.isPlaying.set(isPlaying)
      state.speed.set(speed)
      state.hoveredChainIndexes.set(chainIndexes)
      state.hoveredChainInfo.set(chainInfo)
      state.isSequenceHovered.set(isSequenceHovered)
      state.isPredecessorsHovered.set(isPredecessorsHovered)
      state.navigatorVersion.set(version)

      // 重置状态
      stateManager.resetState()

      // 验证所有状态都被重置到初始值
      expect(state.input.get()).toEqual(defaultInput)
      expect(state.isPlaying.get()).toBe(false)
      expect(state.speed.get()).toBe(500) // 默认速度
      expect(state.hoveredChainIndexes.get()).toEqual([])
      expect(state.hoveredChainInfo.get()).toBeUndefined()
      expect(state.isSequenceHovered.get()).toBe(false)
      expect(state.isPredecessorsHovered.get()).toBe(false)
      expect(state.navigatorVersion.get()).toBe(0)
    },
  )
})
