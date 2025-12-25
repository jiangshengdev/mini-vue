/**
 * LIS 算法可视化 - 步骤导航器模块。
 *
 * @remarks
 * 本模块提供步骤导航器的工厂函数，封装步骤索引的管理逻辑，
 * 支持前进、后退、跳转和重置操作，供 UI 组件控制可视化进度。
 */

import type { NavigatorState, StepNavigator, TraceResult, VisualizationStep } from './types'

/**
 * 创建步骤导航器实例。
 *
 * @remarks
 * 导航器内部维护当前步骤索引，通过闭包封装状态，
 * 对外暴露只读的状态查询和受控的导航操作。
 *
 * @param trace - LIS 算法的追踪结果，包含所有步骤数据
 * @returns 实现 `StepNavigator` 接口的导航器实例
 */
export function createStepNavigator(trace: TraceResult): StepNavigator {
  /* 当前步骤索引，初始为第一步（索引 0） */
  let currentStepIndex = 0

  /**
   * 获取当前导航状态快照。
   */
  const getState = (): NavigatorState => {
    return {
      currentStep: currentStepIndex,
      totalSteps: trace.steps.length,
      canGoBack: currentStepIndex > 0,
      canGoForward: currentStepIndex < trace.steps.length - 1,
    }
  }

  /**
   * 获取当前步骤的完整数据。
   */
  const getCurrentStep = (): VisualizationStep | undefined => {
    return trace.steps[currentStepIndex]
  }

  /**
   * 获取上一步的数据，用于状态对比和动画过渡。
   */
  const getPreviousStep = (): VisualizationStep | undefined => {
    if (currentStepIndex > 0) {
      return trace.steps[currentStepIndex - 1]
    }

    return undefined
  }

  /**
   * 前进到下一步。
   */
  const next = (): VisualizationStep | undefined => {
    if (currentStepIndex < trace.steps.length - 1) {
      currentStepIndex++

      return getCurrentStep()
    }

    return undefined
  }

  /**
   * 后退到上一步。
   */
  const previous = (): VisualizationStep | undefined => {
    if (currentStepIndex > 0) {
      currentStepIndex--

      return getCurrentStep()
    }

    return undefined
  }

  /**
   * 跳转到指定步骤索引。
   */
  const goTo = (stepIndex: number): VisualizationStep | undefined => {
    if (stepIndex >= 0 && stepIndex < trace.steps.length) {
      currentStepIndex = stepIndex

      return getCurrentStep()
    }

    return undefined
  }

  /**
   * 重置导航器到初始状态（第一步）。
   */
  const reset = (): void => {
    currentStepIndex = 0
  }

  return {
    getState,
    getCurrentStep,
    getPreviousStep,
    next,
    prev: previous,
    goTo,
    reset,
  }
}
