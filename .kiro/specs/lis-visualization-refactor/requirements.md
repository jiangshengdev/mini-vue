# Requirements Document

## Introduction

本文档定义了 `playground/views/lis-visualization` 模块的代码重构需求。该模块是一个 LIS（最长递增子序列）算法可视化工具，当前实现存在以下问题：

1. **主组件过于庞大**：`index.tsx` 包含约 250 行代码，混合了状态管理、事件处理、自动播放逻辑和渲染逻辑
2. **状态管理分散**：响应式状态、导航器状态、hover 状态等分散在主组件中，缺乏统一管理
3. **事件处理逻辑耦合**：键盘快捷键、鼠标事件、播放控制等逻辑直接写在组件内部
4. **缺乏可测试性**：核心业务逻辑与 UI 组件紧密耦合，难以单独测试

重构目标是将代码拆分为更小、更专注的模块，提高可维护性和可测试性。

## Glossary

- **Main_Component**: 主页面组件 `LongestIncreasingSubsequenceVisualization`
- **State_Manager**: 负责管理所有响应式状态的模块
- **Playback_Controller**: 负责自动播放逻辑的控制器
- **Keyboard_Handler**: 负责键盘快捷键处理的模块
- **Hover_Manager**: 负责管理 hover 状态和链高亮的模块
- **Navigator**: 步骤导航器，管理当前步骤和导航操作
- **Trace**: 追踪结果，包含所有可视化步骤数据

## Requirements

### Requirement 1: 状态管理模块提取

**User Story:** As a developer, I want the visualization state to be managed in a dedicated module, so that state logic is centralized and easier to maintain.

#### Acceptance Criteria

1. THE State_Manager SHALL export a `createVisualizationState` function that initializes all reactive states
2. WHEN `createVisualizationState` is called, THE State_Manager SHALL return an object containing all state accessors and mutators
3. THE State_Manager SHALL manage the following states: input array, isPlaying, speed, hoveredChainIndexes, hoveredChainInfo, isSequenceHovered, isPredecessorsHovered, navigatorVersion
4. THE State_Manager SHALL provide getter and setter methods for each state
5. WHEN state changes occur, THE State_Manager SHALL ensure reactive updates propagate correctly

### Requirement 2: 播放控制器提取

**User Story:** As a developer, I want the auto-play logic to be encapsulated in a dedicated controller, so that playback behavior is isolated and testable.

#### Acceptance Criteria

1. THE Playback_Controller SHALL export a `createPlaybackController` function
2. WHEN `startAutoPlay` is called, THE Playback_Controller SHALL start a timer that advances steps at the configured speed
3. WHEN `stopAutoPlay` is called, THE Playback_Controller SHALL clear the timer and set isPlaying to false
4. WHEN the navigator reaches the last step during auto-play, THE Playback_Controller SHALL automatically stop playback
5. WHEN speed changes during playback, THE Playback_Controller SHALL restart the timer with the new speed
6. THE Playback_Controller SHALL provide a `dispose` method to clean up resources

### Requirement 3: 键盘处理模块提取

**User Story:** As a developer, I want keyboard shortcut handling to be in a separate module, so that input handling is decoupled from the main component.

#### Acceptance Criteria

1. THE Keyboard_Handler SHALL export a `createKeyboardHandler` function
2. WHEN ArrowLeft is pressed, THE Keyboard_Handler SHALL trigger the previous step action
3. WHEN ArrowRight is pressed, THE Keyboard_Handler SHALL trigger the next step action
4. WHEN Home is pressed, THE Keyboard_Handler SHALL trigger the reset action
5. WHEN End is pressed, THE Keyboard_Handler SHALL navigate to the last step
6. WHEN Space is pressed, THE Keyboard_Handler SHALL toggle auto-play
7. WHEN + or = is pressed, THE Keyboard_Handler SHALL increase playback speed (decrease interval)
8. WHEN - or \_ is pressed, THE Keyboard_Handler SHALL decrease playback speed (increase interval)
9. WHEN focus is on an input element, THE Keyboard_Handler SHALL ignore keyboard shortcuts
10. THE Keyboard_Handler SHALL provide a `dispose` method to remove event listeners

### Requirement 4: Hover 管理模块提取

**User Story:** As a developer, I want hover state management to be in a dedicated module, so that hover logic is reusable and testable.

#### Acceptance Criteria

1. THE Hover_Manager SHALL export a `createHoverManager` function
2. WHEN a chain is hovered, THE Hover_Manager SHALL update hoveredChainIndexes with the chain's index list
3. WHEN a chain hover ends, THE Hover_Manager SHALL clear hoveredChainIndexes and hoveredChainInfo
4. WHEN the step changes, THE Hover_Manager SHALL refresh hover state to maintain consistency
5. THE Hover_Manager SHALL provide methods for sequence hover and predecessors hover states

### Requirement 5: 主组件简化

**User Story:** As a developer, I want the main component to be a thin orchestration layer, so that it is easier to understand and maintain.

#### Acceptance Criteria

1. THE Main_Component SHALL import and compose the extracted modules
2. THE Main_Component SHALL delegate state management to State_Manager
3. THE Main_Component SHALL delegate playback control to Playback_Controller
4. THE Main_Component SHALL delegate keyboard handling to Keyboard_Handler
5. THE Main_Component SHALL delegate hover management to Hover_Manager
6. THE Main_Component SHALL only contain rendering logic and module composition
7. WHEN the component is disposed, THE Main_Component SHALL call dispose methods on all controllers

### Requirement 6: 事件处理函数工厂

**User Story:** As a developer, I want event handlers to be created through a factory function, so that handler creation is centralized and consistent.

#### Acceptance Criteria

1. THE Main_Component SHALL use a `createEventHandlers` function to create all event handlers
2. THE `createEventHandlers` function SHALL accept dependencies (state, navigator, controllers) as parameters
3. WHEN `createEventHandlers` is called, it SHALL return an object containing all event handler functions
4. THE event handlers SHALL include: handleInputChange, handlePrevious, handleNext, handleReset, handleTogglePlay, handleSpeedChange, handleIndexClick, handleChainHover, handleChainLeave

### Requirement 7: 类型定义增强

**User Story:** As a developer, I want comprehensive type definitions for the new modules, so that type safety is maintained across the codebase.

#### Acceptance Criteria

1. THE types.ts file SHALL export interfaces for State_Manager, Playback_Controller, Keyboard_Handler, and Hover_Manager
2. WHEN a new module is created, THE types.ts file SHALL include its public interface
3. THE type definitions SHALL use strict TypeScript types without `any`
4. THE type definitions SHALL be compatible with the existing component props interfaces

### Requirement 8: 向后兼容性

**User Story:** As a user, I want the visualization to work exactly as before after refactoring, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN the refactored component is rendered, THE visualization SHALL display identically to the original
2. WHEN keyboard shortcuts are used, THE behavior SHALL match the original implementation
3. WHEN auto-play is activated, THE playback SHALL behave identically to the original
4. WHEN hover interactions occur, THE highlighting SHALL match the original behavior
5. THE existing property tests SHALL pass without modification
