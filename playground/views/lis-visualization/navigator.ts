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
  let currentStepIndex = 0

  const getState = (): NavigatorState => {
    return {
      currentStep: currentStepIndex,
      totalSteps: trace.steps.length,
      canGoBack: currentStepIndex > 0,
      canGoForward: currentStepIndex < trace.steps.length - 1,
    }
  }

  const getCurrentStep = (): VisualizationStep | undefined => {
    return trace.steps[currentStepIndex]
  }

  const getPreviousStep = (): VisualizationStep | undefined => {
    if (currentStepIndex > 0) {
      return trace.steps[currentStepIndex - 1]
    }

    return undefined
  }

  const next = (): VisualizationStep | undefined => {
    if (currentStepIndex < trace.steps.length - 1) {
      currentStepIndex++

      return getCurrentStep()
    }

    return undefined
  }

  const previous = (): VisualizationStep | undefined => {
    if (currentStepIndex > 0) {
      currentStepIndex--

      return getCurrentStep()
    }

    return undefined
  }

  const goTo = (stepIndex: number): VisualizationStep | undefined => {
    if (stepIndex >= 0 && stepIndex < trace.steps.length) {
      currentStepIndex = stepIndex

      return getCurrentStep()
    }

    return undefined
  }

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
