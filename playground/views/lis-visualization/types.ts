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

// ============================================================================
// 重构模块接口定义
// ============================================================================

/** 状态引用类型（响应式状态的访问器） */
export interface StateRef<T> {
  /** 获取当前值 */
  get(): T
  /** 设置新值 */
  set(value: T): void
}

/** 可视化状态集合 */
export interface VisualizationState {
  /** 输入数组 */
  input: StateRef<number[]>
  /** 是否正在自动播放 */
  isPlaying: StateRef<boolean>
  /** 播放速度（毫秒） */
  speed: StateRef<number>
  /** 当前 hover 的链索引列表 */
  hoveredChainIndexes: StateRef<number[]>
  /** 当前 hover 的链信息 */
  hoveredChainInfo: StateRef<{ chainIndex: number } | undefined>
  /** Sequence 区域是否被 hover */
  isSequenceHovered: StateRef<boolean>
  /** Predecessors 区域是否被 hover */
  isPredecessorsHovered: StateRef<boolean>
  /** 导航器版本号（用于触发响应式更新） */
  navigatorVersion: StateRef<number>
}

/** 控制器基础接口 */
export interface Disposable {
  /** 清理资源 */
  dispose(): void
}

/** 状态管理器 */
export interface StateManager extends Disposable {
  /** 获取所有状态 */
  getState(): VisualizationState
  /** 重置所有状态到初始值 */
  resetState(): void
  /** 增加导航器版本号以触发更新 */
  incrementVersion(): void
}

/** 播放控制器依赖 */
export interface PlaybackControllerDeps {
  /** 状态管理器 */
  stateManager: StateManager
  /** 步骤导航器 */
  navigator: StepNavigator
  /** 步骤更新回调 */
  onStepUpdate: () => void
}

/** 播放控制器 */
export interface PlaybackController extends Disposable {
  /** 开始自动播放 */
  start(): void
  /** 停止自动播放 */
  stop(): void
  /** 切换播放状态 */
  toggle(): void
  /** 更新播放速度（如果正在播放则重启） */
  updateSpeed(newSpeed: number): void
}

/** 键盘处理器动作 */
export interface KeyboardHandlerActions {
  /** 上一步 */
  onPrevious: () => void
  /** 下一步 */
  onNext: () => void
  /** 重置 */
  onReset: () => void
  /** 跳转到最后一步 */
  onGoToEnd: () => void
  /** 切换播放 */
  onTogglePlay: () => void
  /** 加速 */
  onSpeedUp: () => void
  /** 减速 */
  onSpeedDown: () => void
}

/** 键盘处理器 */
export interface KeyboardHandler extends Disposable {
  /** 注册键盘事件监听 */
  register(): void
}

/** Hover 管理器依赖 */
export interface HoverManagerDeps {
  /** 状态管理器 */
  stateManager: StateManager
  /** 获取当前步骤 */
  getCurrentStep: () => VisualizationStep | undefined
}

/** Hover 管理器 */
export interface HoverManager {
  /** 处理链 hover 进入 */
  handleChainHover(indexes: number[], chainIndex: number): void
  /** 处理链 hover 离开 */
  handleChainLeave(): void
  /** 处理 Sequence 区域 hover 进入 */
  handleSequenceHover(): void
  /** 处理 Sequence 区域 hover 离开 */
  handleSequenceLeave(): void
  /** 处理 Predecessors 区域 hover 进入 */
  handlePredecessorsHover(): void
  /** 处理 Predecessors 区域 hover 离开 */
  handlePredecessorsLeave(): void
  /** 刷新 hover 状态（步骤切换时调用） */
  refreshHoverState(): void
}

/** 事件处理器依赖 */
export interface EventHandlersDeps {
  /** 状态管理器 */
  stateManager: StateManager
  /** 步骤导航器获取器 */
  getNavigator: () => StepNavigator
  /** 播放控制器 */
  playbackController: PlaybackController
  /** Hover 管理器 */
  hoverManager: HoverManager
  /** 重置导航器回调 */
  resetNavigator: () => void
  /** 步骤更新回调 */
  updateStep: () => void
}

/** 事件处理器集合 */
export interface EventHandlers {
  /** 输入变化处理 */
  handleInputChange: (newInput: number[]) => void
  /** 上一步 */
  handlePrevious: () => void
  /** 下一步 */
  handleNext: () => void
  /** 重置 */
  handleReset: () => void
  /** 切换播放 */
  handleTogglePlay: () => void
  /** 速度变化 */
  handleSpeedChange: (newSpeed: number) => void
  /** 索引点击 */
  handleIndexClick: (index: number) => void
  /** 链 hover */
  handleChainHover: (indexes: number[], chainIndex: number) => void
  /** 链 hover 离开 */
  handleChainLeave: () => void
  /** Sequence hover */
  handleSequenceHover: () => void
  /** Sequence hover 离开 */
  handleSequenceLeave: () => void
  /** Predecessors hover */
  handlePredecessorsHover: () => void
  /** Predecessors hover 离开 */
  handlePredecessorsLeave: () => void
}
