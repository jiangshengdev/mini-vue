/**
 * LIS 算法可视化 - 播放控制器单元测试
 *
 * 使用 fake timers 测试定时器行为和自动停止逻辑。
 *
 * _Requirements: 2.2, 2.3, 2.4, 2.5_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlaybackController } from '../controllers/playback-controller.ts'
import { createStateManager } from '../controllers/state-manager.ts'
import type { StepNavigator, TraceResult, VisualizationStep } from '../types.ts'

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

/**
 * 创建模拟的步骤导航器
 */
function createMockNavigator(trace: TraceResult): StepNavigator {
  let currentStepIndex = 0

  return {
    getState() {
      return {
        currentStep: currentStepIndex,
        totalSteps: trace.steps.length,
        canGoBack: currentStepIndex > 0,
        canGoForward: currentStepIndex < trace.steps.length - 1,
      }
    },
    getCurrentStep() {
      return trace.steps[currentStepIndex]
    },
    getPreviousStep() {
      return currentStepIndex > 0 ? trace.steps[currentStepIndex - 1] : undefined
    },
    next() {
      if (currentStepIndex < trace.steps.length - 1) {
        currentStepIndex++

        return trace.steps[currentStepIndex]
      }

      return undefined
    },
    prev() {
      if (currentStepIndex > 0) {
        currentStepIndex--

        return trace.steps[currentStepIndex]
      }

      return undefined
    },
    goTo(stepIndex: number) {
      if (stepIndex >= 0 && stepIndex < trace.steps.length) {
        currentStepIndex = stepIndex

        return trace.steps[currentStepIndex]
      }

      return undefined
    },
    reset() {
      currentStepIndex = 0
    },
  }
}

describe('createPlaybackController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('start', () => {
    it('应该设置 isPlaying 为 true 并启动定时器', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(5)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()

      expect(stateManager.getState().isPlaying.get()).toBe(true)

      // 前进一个定时器周期（默认 500ms）
      vi.advanceTimersByTime(500)

      expect(onStepUpdate).toHaveBeenCalledTimes(1)
      expect(navigator.getState().currentStep).toBe(1)

      controller.dispose()
    })

    it('应该按照设定的速度前进步骤', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(10)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      // 设置速度为 200ms
      stateManager.getState().speed.set(200)

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()

      // 前进 600ms，应该触发 3 次
      vi.advanceTimersByTime(600)

      expect(onStepUpdate).toHaveBeenCalledTimes(3)
      expect(navigator.getState().currentStep).toBe(3)

      controller.dispose()
    })

    it('输入变更后应使用最新的导航器实例', () => {
      const stateManager = createStateManager([1, 2, 3])
      const traceA = createMockTrace(3)
      const traceB = createMockTrace(4)
      const staleNavigator = createMockNavigator(traceA)
      let currentNavigator = staleNavigator
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return currentNavigator
        },
        onStepUpdate,
      })

      // 模拟输入变更后重建导航器
      controller.stop()
      currentNavigator = createMockNavigator(traceB)

      controller.start()

      vi.advanceTimersByTime(500)

      expect(onStepUpdate).toHaveBeenCalledTimes(1)
      expect(currentNavigator.getState().currentStep).toBe(1)
      expect(staleNavigator.getState().currentStep).toBe(0)

      controller.dispose()
    })
  })

  describe('stop', () => {
    it('应该设置 isPlaying 为 false 并清除定时器', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(5)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()
      expect(stateManager.getState().isPlaying.get()).toBe(true)

      controller.stop()
      expect(stateManager.getState().isPlaying.get()).toBe(false)

      // 前进时间，不应该再触发回调
      vi.advanceTimersByTime(1000)
      expect(onStepUpdate).not.toHaveBeenCalled()

      controller.dispose()
    })

    it('多次调用 stop 应该是安全的', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(5)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()
      controller.stop()
      controller.stop()
      controller.stop()

      expect(stateManager.getState().isPlaying.get()).toBe(false)

      controller.dispose()
    })
  })

  describe('toggle', () => {
    it('应该在停止状态下启动播放', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(5)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      expect(stateManager.getState().isPlaying.get()).toBe(false)

      controller.toggle()

      expect(stateManager.getState().isPlaying.get()).toBe(true)

      controller.dispose()
    })

    it('应该在播放状态下停止播放', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(5)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()
      expect(stateManager.getState().isPlaying.get()).toBe(true)

      controller.toggle()

      expect(stateManager.getState().isPlaying.get()).toBe(false)

      controller.dispose()
    })
  })

  describe('updateSpeed', () => {
    it('应该更新速度状态', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(5)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.updateSpeed(300)

      expect(stateManager.getState().speed.get()).toBe(300)

      controller.dispose()
    })

    it('在播放状态下更新速度应该重启定时器', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(10)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      // 以 500ms 速度开始播放
      controller.start()

      // 前进 400ms（不足一个周期）
      vi.advanceTimersByTime(400)
      expect(onStepUpdate).not.toHaveBeenCalled()

      // 更新速度为 200ms（这会重启定时器）
      controller.updateSpeed(200)

      // 前进 200ms（新的一个周期）
      vi.advanceTimersByTime(200)
      expect(onStepUpdate).toHaveBeenCalledTimes(1)

      controller.dispose()
    })
  })

  describe('自动停止逻辑', () => {
    it('到达最后一步时应该自动停止播放', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(3) // 只有 3 步
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()
      expect(stateManager.getState().isPlaying.get()).toBe(true)

      // 前进 2 个周期（从步骤 0 到步骤 2，即最后一步）
      vi.advanceTimersByTime(500)
      expect(navigator.getState().currentStep).toBe(1)
      expect(stateManager.getState().isPlaying.get()).toBe(true)

      vi.advanceTimersByTime(500)
      expect(navigator.getState().currentStep).toBe(2)
      expect(stateManager.getState().isPlaying.get()).toBe(true)

      // 再前进一个周期，navigator.next() 返回 undefined，应该自动停止
      vi.advanceTimersByTime(500)
      expect(stateManager.getState().isPlaying.get()).toBe(false)

      // 确认不再触发回调
      vi.advanceTimersByTime(1000)
      expect(onStepUpdate).toHaveBeenCalledTimes(2) // 只有 2 次成功的步骤更新

      controller.dispose()
    })

    it('单步骤时启动播放应该立即停止', () => {
      const stateManager = createStateManager([1])
      const trace = createMockTrace(1) // 只有 1 步
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()
      expect(stateManager.getState().isPlaying.get()).toBe(true)

      // 前进一个周期，navigator.next() 返回 undefined，应该自动停止
      vi.advanceTimersByTime(500)
      expect(stateManager.getState().isPlaying.get()).toBe(false)
      expect(onStepUpdate).not.toHaveBeenCalled()

      controller.dispose()
    })
  })

  describe('dispose', () => {
    it('应该停止播放并清理定时器', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(5)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()
      expect(stateManager.getState().isPlaying.get()).toBe(true)

      controller.dispose()

      expect(stateManager.getState().isPlaying.get()).toBe(false)

      // 前进时间，不应该再触发回调
      vi.advanceTimersByTime(1000)
      expect(onStepUpdate).not.toHaveBeenCalled()
    })

    it('多次调用 dispose 应该是安全的', () => {
      const stateManager = createStateManager([1, 2, 3])
      const trace = createMockTrace(5)
      const navigator = createMockNavigator(trace)
      const onStepUpdate = vi.fn()

      const controller = createPlaybackController({
        stateManager,
        getNavigator() {
          return navigator
        },
        onStepUpdate,
      })

      controller.start()
      controller.dispose()
      controller.dispose()
      controller.dispose()

      expect(stateManager.getState().isPlaying.get()).toBe(false)
    })
  })
})
