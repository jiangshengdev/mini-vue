# Design Document: LIS Visualization Refactor

## Overview

本设计文档描述了 `playground/views/lis-visualization` 模块的重构方案。重构的核心思想是将单一的大型组件拆分为多个职责单一的模块，遵循关注点分离原则。

重构后的架构采用组合模式，主组件作为编排层，协调各个独立模块的工作。每个模块都有明确的职责边界和公开接口，便于独立测试和维护。

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LongestIncreasingSubsequenceVisualization    │
│                         (Main Component - Orchestrator)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ State        │  │ Playback     │  │ Keyboard             │  │
│  │ Manager      │  │ Controller   │  │ Handler              │  │
│  │              │  │              │  │                      │  │
│  │ - input      │  │ - start()    │  │ - register()         │  │
│  │ - isPlaying  │  │ - stop()     │  │ - dispose()          │  │
│  │ - speed      │  │ - dispose()  │  │                      │  │
│  │ - hover...   │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Hover        │  │ Event        │  │ Navigator            │  │
│  │ Manager      │  │ Handlers     │  │ (existing)           │  │
│  │              │  │              │  │                      │  │
│  │ - onChain    │  │ - onInput    │  │ - next()             │  │
│  │ - onSeq      │  │ - onPrev     │  │ - prev()             │  │
│  │ - refresh()  │  │ - onNext     │  │ - goTo()             │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                         UI Components                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ ArrayDisp  │ │ SeqGraph   │ │ ActionPanel│ │ StepCtrls  │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 文件结构

```
playground/views/lis-visualization/
├── index.tsx                    # 主组件（简化后）
├── types.ts                     # 类型定义（增强）
├── navigator.ts                 # 步骤导航器（保持不变）
├── trace.ts                     # 追踪函数（保持不变）
├── controllers/                 # 新增：控制器目录
│   ├── index.ts                 # 控制器导出
│   ├── state-manager.ts         # 状态管理器
│   ├── playback-controller.ts   # 播放控制器
│   ├── keyboard-handler.ts      # 键盘处理器
│   └── hover-manager.ts         # Hover 管理器
├── handlers/                    # 新增：事件处理器目录
│   ├── index.ts                 # 处理器导出
│   └── event-handlers.ts        # 事件处理器工厂
├── components/                  # UI 组件（保持不变）
│   ├── index.ts
│   ├── action-panel.tsx
│   ├── array-display.tsx
│   ├── input-editor.tsx
│   ├── sequence-graph.tsx
│   └── step-controls.tsx
├── styles/
│   └── visualization.module.css
└── __tests__/
    ├── navigator.test.ts
    ├── navigator.property.test.ts
    ├── trace.property.test.ts
    ├── state-manager.test.ts      # 新增
    ├── playback-controller.test.ts # 新增
    └── hover-manager.test.ts       # 新增
```

## Components and Interfaces

### State Manager

状态管理器负责集中管理所有响应式状态，提供统一的访问和修改接口。

```typescript
interface VisualizationState {
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

interface StateManager {
  /** 获取所有状态 */
  getState(): VisualizationState
  /** 重置所有状态到初始值 */
  resetState(): void
  /** 增加导航器版本号以触发更新 */
  incrementVersion(): void
}

function createStateManager(defaultInput: number[]): StateManager
```

### Playback Controller

播放控制器封装自动播放的定时器逻辑。

```typescript
interface PlaybackControllerDeps {
  /** 状态管理器 */
  stateManager: StateManager
  /** 步骤导航器 */
  navigator: StepNavigator
  /** 步骤更新回调 */
  onStepUpdate: () => void
}

interface PlaybackController {
  /** 开始自动播放 */
  start(): void
  /** 停止自动播放 */
  stop(): void
  /** 切换播放状态 */
  toggle(): void
  /** 更新播放速度（如果正在播放则重启） */
  updateSpeed(newSpeed: number): void
  /** 清理资源 */
  dispose(): void
}

function createPlaybackController(deps: PlaybackControllerDeps): PlaybackController
```

### Keyboard Handler

键盘处理器管理全局键盘事件监听。

```typescript
interface KeyboardHandlerActions {
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

interface KeyboardHandler {
  /** 注册键盘事件监听 */
  register(): void
  /** 移除键盘事件监听 */
  dispose(): void
}

function createKeyboardHandler(actions: KeyboardHandlerActions): KeyboardHandler
```

### Hover Manager

Hover 管理器处理链高亮和区域 hover 状态。

```typescript
interface HoverManagerDeps {
  /** 状态管理器 */
  stateManager: StateManager
  /** 获取当前步骤 */
  getCurrentStep: () => VisualizationStep | undefined
}

interface HoverManager {
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

function createHoverManager(deps: HoverManagerDeps): HoverManager
```

### Event Handlers Factory

事件处理器工厂创建所有 UI 事件处理函数。

```typescript
interface EventHandlersDeps {
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

interface EventHandlers {
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

function createEventHandlers(deps: EventHandlersDeps): EventHandlers
```

## Data Models

### 现有数据模型（保持不变）

```typescript
/** 步骤操作类型 */
type StepAction =
  | { type: 'init' }
  | { type: 'append'; index: number }
  | { type: 'replace'; position: number; index: number }
  | { type: 'skip'; index: number }

/** 单个可视化步骤 */
interface VisualizationStep {
  stepIndex: number
  currentIndex: number
  currentValue: number
  action: StepAction
  sequence: number[]
  predecessors: number[]
}

/** 完整追踪结果 */
interface TraceResult {
  input: number[]
  steps: VisualizationStep[]
  result: number[]
}

/** 导航状态 */
interface NavigatorState {
  currentStep: number
  totalSteps: number
  canGoBack: boolean
  canGoForward: boolean
}
```

### 新增类型定义

```typescript
/** 状态引用类型（来自 reactivity 模块） */
interface StateRef<T> {
  get(): T
  set(value: T): void
}

/** 控制器基础接口 */
interface Disposable {
  dispose(): void
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: 状态设置后获取一致性

_For any_ state value of any supported type, when `set(value)` is called on a state reference, immediately calling `get()` SHALL return the same value.

**Validates: Requirements 1.5**

This is a round-trip property that ensures the reactive state system correctly stores and retrieves values without corruption or transformation.

### Property 2: Hover 状态更新正确性

_For any_ chain index list and chain index, when `handleChainHover(indexes, chainIndex)` is called, the `hoveredChainIndexes` state SHALL contain exactly the provided indexes, and `hoveredChainInfo` SHALL contain the provided chainIndex.

**Validates: Requirements 4.2**

This property ensures that hover state updates are correctly propagated to the underlying state manager.

### Property 3: 现有属性测试兼容性

_For any_ input that passes the existing property tests (navigator and trace tests), the refactored implementation SHALL produce identical results.

**Validates: Requirements 8.2, 8.5**

This property is validated by running the existing property test suite without modification. The tests in `__tests__/navigator.property.test.ts` and `__tests__/trace.property.test.ts` serve as the oracle for correctness.

## Error Handling

### State Manager Errors

- **Invalid state type**: 如果尝试设置不兼容类型的值，TypeScript 编译器会在编译时捕获
- **Null/undefined handling**: 状态管理器应该正确处理 `undefined` 值（如 `hoveredChainInfo`）

### Playback Controller Errors

- **Timer cleanup**: `dispose()` 必须确保定时器被清理，即使在异常情况下
- **Navigator unavailable**: 如果导航器返回 `undefined`，播放控制器应该停止播放

### Keyboard Handler Errors

- **Event listener cleanup**: `dispose()` 必须确保事件监听器被移除
- **Invalid key handling**: 未知按键应该被忽略，不应抛出错误

### Hover Manager Errors

- **Invalid chain index**: 如果 `chainIndex` 超出范围，应该清空 hover 状态而不是抛出错误
- **Step unavailable**: 如果当前步骤为 `undefined`，`refreshHoverState()` 应该清空 hover 状态

## Testing Strategy

### 单元测试

单元测试用于验证各个模块的具体行为和边界条件：

1. **State Manager Tests** (`state-manager.test.ts`)
   - 验证初始状态值
   - 验证状态更新
   - 验证 `resetState()` 功能
   - 验证 `incrementVersion()` 功能

2. **Playback Controller Tests** (`playback-controller.test.ts`)
   - 使用 `vi.useFakeTimers()` 测试定时器行为
   - 验证 `start()`、`stop()`、`toggle()` 方法
   - 验证自动停止逻辑
   - 验证速度更新逻辑

3. **Keyboard Handler Tests** (`keyboard-handler.test.ts`)
   - 模拟键盘事件
   - 验证各快捷键映射
   - 验证焦点检测逻辑
   - 验证 `dispose()` 清理

4. **Hover Manager Tests** (`hover-manager.test.ts`)
   - 验证 hover 状态更新
   - 验证 hover 离开清理
   - 验证步骤切换时的刷新逻辑

### 属性测试

属性测试用于验证通用正确性属性：

1. **State Round-Trip Property** (`state-manager.property.test.ts`)
   - 使用 fast-check 生成随机状态值
   - 验证 set/get 一致性
   - 最少 100 次迭代

2. **Hover State Property** (`hover-manager.property.test.ts`)
   - 使用 fast-check 生成随机链索引
   - 验证 hover 状态更新正确性
   - 最少 100 次迭代

### 现有测试兼容性

重构后必须确保以下现有测试继续通过：

- `__tests__/navigator.test.ts` - 导航器单元测试
- `__tests__/navigator.property.test.ts` - 导航器属性测试
- `__tests__/trace.property.test.ts` - 追踪函数属性测试

### 测试配置

```typescript
// vitest.config.ts 中的属性测试配置
export default defineConfig({
  test: {
    // 属性测试最少运行 100 次
    // fast-check 默认配置
  },
})
```

### 测试标注格式

每个属性测试必须包含以下注释：

```typescript
/**
 * Feature: lis-visualization-refactor, Property N: [Property Title]
 * Validates: Requirements X.Y
 */
```
