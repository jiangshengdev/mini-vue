/**
 * LIS 算法可视化模块的核心类型定义。
 *
 * @remarks
 * 本文件定义了可视化所需的所有数据结构，包括步骤操作、追踪结果、导航状态等。
 * 这些类型被控制器、组件和工具函数共同使用。
 */

/**
 * 步骤操作类型，描述 LIS 算法在每一步执行的具体动作。
 *
 * @remarks
 * - `init`：初始化步骤，算法开始前的状态。
 * - `append`：将当前元素追加到序列末尾。
 * - `replace`：用当前元素替换序列中指定位置的元素。
 * - `skip`：跳过当前元素（不影响序列）。
 */
export type StepAction =
  | { type: 'init' }
  | { type: 'append'; index: number }
  | { type: 'replace'; position: number; index: number }
  | { type: 'skip'; index: number }

/**
 * 单个可视化步骤的完整状态快照。
 *
 * @remarks
 * 每个步骤记录了算法执行到某一时刻的完整状态，便于前后导航和状态回放。
 */
export interface VisualizationStep {
  /** 步骤编号，从 0 开始递增。 */
  stepIndex: number
  /** 当前正在处理的输入数组索引。 */
  currentIndex: number
  /** 当前索引对应的输入值。 */
  currentValue: number
  /** 本步骤执行的操作类型。 */
  action: StepAction
  /** 操作后的递增序列状态，存储的是输入数组的索引列表。 */
  sequence: number[]
  /** 操作后的前驱数组，`predecessors[i]` 表示索引 `i` 在 LIS 中的前驱索引。 */
  predecessors: number[]
}

/**
 * LIS 算法的完整追踪结果。
 *
 * @remarks
 * 包含原始输入、所有中间步骤和最终结果，供可视化组件逐步展示。
 */
export interface TraceResult {
  /** 原始输入数组。 */
  input: number[]
  /** 算法执行的所有步骤列表。 */
  steps: VisualizationStep[]
  /** 最终 LIS 的索引列表，按递增顺序排列。 */
  result: number[]
}

/**
 * 导航器的当前状态快照。
 *
 * @remarks
 * 用于 UI 组件判断导航按钮的可用性和显示当前进度。
 */
export interface NavigatorState {
  /** 当前步骤索引，范围 `[0, totalSteps - 1]`。 */
  currentStep: number
  /** 总步骤数。 */
  totalSteps: number
  /** 是否可以后退到上一步。 */
  canGoBack: boolean
  /** 是否可以前进到下一步。 */
  canGoForward: boolean
}

/**
 * 步骤导航器接口，提供步骤间的导航能力。
 *
 * @remarks
 * 导航器封装了步骤索引的管理逻辑，支持前进、后退、跳转和重置操作。
 * 组件通过导航器获取当前步骤数据，而不直接操作步骤索引。
 */
export interface StepNavigator {
  /** 获取当前导航状态快照。 */
  getState(): NavigatorState
  /** 获取当前步骤的完整数据。 */
  getCurrentStep(): VisualizationStep | undefined
  /** 获取上一步的数据，用于状态对比和动画过渡。 */
  getPreviousStep(): VisualizationStep | undefined
  /** 前进到下一步，返回新步骤数据。 */
  next(): VisualizationStep | undefined
  /** 后退到上一步，返回新步骤数据。 */
  prev(): VisualizationStep | undefined
  /** 跳转到指定步骤索引，返回目标步骤数据。 */
  goTo(stepIndex: number): VisualizationStep | undefined
  /** 重置导航器到初始状态（第一步）。 */
  reset(): void
}

/**
 * 重构模块接口定义。
 *
 * @remarks
 * 以下接口定义了可视化模块的控制器和管理器，采用依赖注入模式实现松耦合。
 */

/**
 * 响应式状态引用类型。
 *
 * @remarks
 * 封装了对响应式状态的读写操作，隐藏底层响应式实现细节。
 */
export interface StateRef<T> {
  /** 获取当前状态值。 */
  get(): T
  /** 设置新的状态值。 */
  set(value: T): void
}

/**
 * 可视化模块的完整状态集合。
 *
 * @remarks
 * 所有状态通过 `StateRef` 封装，支持响应式更新和组件自动重渲染。
 */
export interface VisualizationState {
  /** 用户输入的数组数据。 */
  input: StateRef<number[]>
  /** 是否正在自动播放模式。 */
  isPlaying: StateRef<boolean>
  /** 自动播放的步进间隔（毫秒）。 */
  speed: StateRef<number>
  /** 当前 hover 高亮的链索引列表。 */
  hoveredChainIndexes: StateRef<number[]>
  /** 当前 hover 的链信息，包含链在序列中的位置。 */
  hoveredChainInfo: StateRef<{ chainIndex: number } | undefined>
  /** Sequence 区域是否处于 hover 状态。 */
  isSequenceHovered: StateRef<boolean>
  /** Predecessors 区域是否处于 hover 状态。 */
  isPredecessorsHovered: StateRef<boolean>
  /** 导航器版本号，递增以触发依赖组件的响应式更新。 */
  navigatorVersion: StateRef<number>
}

/**
 * 可释放资源的基础接口。
 *
 * @remarks
 * 实现此接口的对象需要在不再使用时调用 `dispose()` 释放资源。
 */
export interface Disposable {
  /** 清理并释放占用的资源（如定时器、事件监听器等）。 */
  dispose(): void
}

/**
 * 状态管理器接口，集中管理可视化模块的所有响应式状态。
 *
 * @remarks
 * 状态管理器是单一数据源，所有组件和控制器通过它读写状态。
 */
export interface StateManager extends Disposable {
  /** 获取完整的状态集合。 */
  getState(): VisualizationState
  /** 重置所有状态到初始默认值。 */
  resetState(): void
  /** 递增导航器版本号，触发依赖组件更新。 */
  incrementVersion(): void
}

/**
 * 播放控制器的依赖项。
 *
 * @remarks
 * 通过依赖注入传入，便于测试和解耦。
 */
export interface PlaybackControllerDeps {
  /** 状态管理器实例。 */
  stateManager: StateManager
  /** 获取当前的步骤导航器实例。 */
  getNavigator: () => StepNavigator
  /** 步骤更新后的回调函数。 */
  onStepUpdate: () => void
}

/**
 * 播放控制器接口，管理自动播放功能。
 *
 * @remarks
 * 控制器负责定时器的启停和播放状态的同步。
 */
export interface PlaybackController extends Disposable {
  /** 开始自动播放，按设定速度逐步前进。 */
  start(): void
  /** 停止自动播放。 */
  stop(): void
  /** 切换播放/暂停状态。 */
  toggle(): void
  /** 更新播放速度，如果正在播放则以新速度重启。 */
  updateSpeed(newSpeed: number): void
}

/**
 * 键盘处理器支持的操作集合。
 *
 * @remarks
 * 定义了所有可通过键盘快捷键触发的操作回调。
 */
export interface KeyboardHandlerActions {
  /** 后退到上一步。 */
  onPrevious: () => void
  /** 前进到下一步。 */
  onNext: () => void
  /** 重置到初始状态。 */
  onReset: () => void
  /** 跳转到最后一步。 */
  onGoToEnd: () => void
  /** 切换播放/暂停状态。 */
  onTogglePlay: () => void
  /** 加快播放速度。 */
  onSpeedUp: () => void
  /** 减慢播放速度。 */
  onSpeedDown: () => void
}

/**
 * 键盘处理器接口，管理键盘快捷键。
 *
 * @remarks
 * 处理器在注册后监听全局键盘事件，并映射到相应的操作。
 */
export interface KeyboardHandler extends Disposable {
  /** 注册键盘事件监听器。 */
  register(): void
}

/**
 * Hover 管理器的依赖项。
 */
export interface HoverManagerDeps {
  /** 状态管理器实例。 */
  stateManager: StateManager
  /** 获取当前步骤数据的函数。 */
  getCurrentStep: () => VisualizationStep | undefined
}

/**
 * Hover 管理器接口，处理鼠标悬停交互。
 *
 * @remarks
 * 管理器负责更新 hover 状态，实现链高亮和区域高亮效果。
 */
export interface HoverManager {
  /** 处理链元素的 hover 进入事件。 */
  handleChainHover(indexes: number[], chainIndex: number): void
  /** 处理链元素的 hover 离开事件。 */
  handleChainLeave(): void
  /** 处理 Sequence 区域的 hover 进入事件。 */
  handleSequenceHover(): void
  /** 处理 Sequence 区域的 hover 离开事件。 */
  handleSequenceLeave(): void
  /** 处理 Predecessors 区域的 hover 进入事件。 */
  handlePredecessorsHover(): void
  /** 处理 Predecessors 区域的 hover 离开事件。 */
  handlePredecessorsLeave(): void
  /** 刷新 hover 状态，在步骤切换时调用以保持状态一致。 */
  refreshHoverState(): void
}

/**
 * 事件处理器工厂的依赖项。
 */
export interface EventHandlersDeps {
  /** 状态管理器实例。 */
  stateManager: StateManager
  /** 获取当前步骤导航器的函数。 */
  getNavigator: () => StepNavigator
  /** 播放控制器实例。 */
  playbackController: PlaybackController
  /** Hover 管理器实例。 */
  hoverManager: HoverManager
  /** 重置导航器的回调函数。 */
  resetNavigator: () => void
  /** 步骤更新后的回调函数。 */
  updateStep: () => void
}

/**
 * 事件处理器集合，提供所有 UI 交互的处理函数。
 *
 * @remarks
 * 这些处理器由事件处理器工厂创建，直接绑定到 UI 组件的事件上。
 */
export interface EventHandlers {
  /** 处理输入数组变化。 */
  handleInputChange: (newInput: number[]) => void
  /** 处理「上一步」按钮点击。 */
  handlePrevious: () => void
  /** 处理「下一步」按钮点击。 */
  handleNext: () => void
  /** 处理「重置」按钮点击。 */
  handleReset: () => void
  /** 处理「播放/暂停」按钮点击。 */
  handleTogglePlay: () => void
  /** 处理播放速度变化。 */
  handleSpeedChange: (newSpeed: number) => void
  /** 处理数组索引点击，跳转到对应步骤。 */
  handleIndexClick: (index: number) => void
  /** 处理链元素 hover 进入。 */
  handleChainHover: (indexes: number[], chainIndex: number) => void
  /** 处理链元素 hover 离开。 */
  handleChainLeave: () => void
  /** 处理 Sequence 区域 hover 进入。 */
  handleSequenceHover: () => void
  /** 处理 Sequence 区域 hover 离开。 */
  handleSequenceLeave: () => void
  /** 处理 Predecessors 区域 hover 进入。 */
  handlePredecessorsHover: () => void
  /** 处理 Predecessors 区域 hover 离开。 */
  handlePredecessorsLeave: () => void
}
