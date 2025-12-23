/**
 * LIS 算法可视化 - 步骤导航器
 */

import type { NavigatorState, StepNavigator, TraceResult, VisualizationStep } from './types'

/**
 * 创建步骤导航器
 *
 * @param trace - 追踪结果
 * @returns 导航器实例
 */
export function createStepNavigator(trace: TraceResult): StepNavigator {
  // TODO: 实现导航器逻辑
  let currentStepIndex = 0

  const getState = (): NavigatorState => ({
    currentStep: currentStepIndex,
    totalSteps: trace.steps.length,
    canGoBack: currentStepIndex > 0,
    canGoForward: currentStepIndex < trace.steps.length - 1,
  })

  const getCurrentStep = (): VisualizationStep | null => {
    return trace.steps[currentStepIndex] ?? null
  }

  const next = (): VisualizationStep | null => {
    if (currentStepIndex < trace.steps.length - 1) {
      currentStepIndex++

      return getCurrentStep()
    }

    return null
  }

  const prev = (): VisualizationStep | null => {
    if (currentStepIndex > 0) {
      currentStepIndex--

      return getCurrentStep()
    }

    return null
  }

  const goTo = (stepIndex: number): VisualizationStep | null => {
    if (stepIndex >= 0 && stepIndex < trace.steps.length) {
      currentStepIndex = stepIndex

      return getCurrentStep()
    }

    return null
  }

  const reset = (): void => {
    currentStepIndex = 0
  }

  return {
    getState,
    getCurrentStep,
    next,
    prev,
    goTo,
    reset,
  }
}
