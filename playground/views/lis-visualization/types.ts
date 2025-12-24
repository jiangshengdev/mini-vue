/**
 * LIS 算法可视化 - 核心类型定义
 */

/** 步骤操作类型 */
export type StepAction =
  | { type: 'init' }
  | { type: 'append'; index: number }
  | { type: 'replace'; position: number; index: number }
  | { type: 'skip'; index: number }

/** 单个可视化步骤 */
export interface VisualizationStep {
  /** 步骤编号（从 0 开始） */
  stepIndex: number
  /** 当前处理的数组索引 */
  currentIndex: number
  /** 当前索引对应的值 */
  currentValue: number
  /** 执行的操作 */
  action: StepAction
  /** 操作后的序列状态（索引列表） */
  sequence: number[]
  /** 操作后的前驱数组 */
  predecessors: number[]
}

/** 完整追踪结果 */
export interface TraceResult {
  /** 原始输入数组 */
  input: number[]
  /** 所有步骤 */
  steps: VisualizationStep[]
  /** 最终 LIS 索引列表 */
  result: number[]
}

/** 导航状态 */
export interface NavigatorState {
  /** 当前步骤索引 */
  currentStep: number
  /** 总步骤数 */
  totalSteps: number
  /** 是否可以后退 */
  canGoBack: boolean
  /** 是否可以前进 */
  canGoForward: boolean
}

/** 步骤导航器 */
export interface StepNavigator {
  /** 获取当前导航状态 */
  getState(): NavigatorState
  /** 获取当前步骤数据 */
  getCurrentStep(): VisualizationStep | undefined
  /** 获取上一步数据（用于状态对比） */
  getPreviousStep(): VisualizationStep | undefined
  /** 前进到下一步 */
  next(): VisualizationStep | undefined
  /** 后退到上一步 */
  prev(): VisualizationStep | undefined
  /** 跳转到指定步骤 */
  goTo(stepIndex: number): VisualizationStep | undefined
  /** 重置到初始状态 */
  reset(): void
}
