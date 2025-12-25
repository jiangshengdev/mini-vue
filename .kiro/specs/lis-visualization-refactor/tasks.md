# Implementation Plan: LIS Visualization Refactor

## Overview

本实现计划将 `playground/views/lis-visualization` 模块从单一大型组件重构为多个职责单一的模块。实现顺序遵循依赖关系：先创建基础模块（类型定义、状态管理），再创建依赖它们的控制器，最后重构主组件。

## Tasks

- [x] 1. 增强类型定义
  - [x] 1.1 在 `types.ts` 中添加新模块的接口定义
    - 添加 `StateRef<T>` 接口
    - 添加 `VisualizationState` 接口
    - 添加 `StateManager` 接口
    - 添加 `PlaybackController` 接口
    - 添加 `KeyboardHandlerActions` 和 `KeyboardHandler` 接口
    - 添加 `HoverManager` 接口
    - 添加 `EventHandlers` 接口
    - 添加 `Disposable` 基础接口
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. 创建状态管理器模块
  - [x] 2.1 创建 `controllers/state-manager.ts`
    - 实现 `createStateManager` 函数
    - 管理所有响应式状态：input, isPlaying, speed, hoveredChainIndexes, hoveredChainInfo, isSequenceHovered, isPredecessorsHovered, navigatorVersion
    - 实现 `getState()`, `resetState()`, `incrementVersion()` 方法
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 2.2 编写状态管理器属性测试
    - **Property 1: 状态设置后获取一致性**
    - **Validates: Requirements 1.5**

- [x] 3. 创建播放控制器模块
  - [x] 3.1 创建 `controllers/playback-controller.ts`
    - 实现 `createPlaybackController` 函数
    - 实现 `start()`, `stop()`, `toggle()`, `updateSpeed()`, `dispose()` 方法
    - 处理自动停止逻辑（到达最后一步时）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 3.2 编写播放控制器单元测试
    - 使用 fake timers 测试定时器行为
    - 测试自动停止逻辑
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 4. 创建键盘处理器模块
  - [x] 4.1 创建 `controllers/keyboard-handler.ts`
    - 实现 `createKeyboardHandler` 函数
    - 实现 `register()`, `dispose()` 方法
    - 处理所有快捷键：ArrowLeft, ArrowRight, Home, End, Space, +/=, -/\_
    - 实现焦点检测逻辑（输入框内忽略快捷键）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_
  - [x] 4.2 编写键盘处理器单元测试
    - 模拟键盘事件测试各快捷键
    - 测试焦点检测逻辑
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 5. 创建 Hover 管理器模块
  - [x] 5.1 创建 `controllers/hover-manager.ts`
    - 实现 `createHoverManager` 函数
    - 实现 `handleChainHover()`, `handleChainLeave()` 方法
    - 实现 `handleSequenceHover()`, `handleSequenceLeave()` 方法
    - 实现 `handlePredecessorsHover()`, `handlePredecessorsLeave()` 方法
    - 实现 `refreshHoverState()` 方法
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 5.2 编写 Hover 管理器属性测试
    - **Property 2: Hover 状态更新正确性**
    - **Validates: Requirements 4.2**

- [x] 6. 创建控制器导出模块
  - [x] 6.1 创建 `controllers/index.ts`
    - 导出所有控制器创建函数
    - 导出相关类型
    - _Requirements: 5.1_

- [x] 7. 创建事件处理器工厂
  - [x] 7.1 创建 `handlers/event-handlers.ts`
    - 实现 `createEventHandlers` 函数
    - 创建所有事件处理函数：handleInputChange, handlePrevious, handleNext, handleReset, handleTogglePlay, handleSpeedChange, handleIndexClick, handleChainHover, handleChainLeave, handleSequenceHover, handleSequenceLeave, handlePredecessorsHover, handlePredecessorsLeave
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 7.2 创建 `handlers/index.ts`
    - 导出事件处理器工厂
    - _Requirements: 6.1_

- [x] 8. Checkpoint - 验证模块独立性
  - 确保所有新模块可以独立编译
  - 运行 `pnpm run typecheck` 验证类型正确性
  - 确保所有测试通过，如有问题请询问用户

- [x] 9. 重构主组件
  - [x] 9.1 重构 `index.tsx` 使用新模块
    - 导入并使用 `createStateManager`
    - 导入并使用 `createPlaybackController`
    - 导入并使用 `createKeyboardHandler`
    - 导入并使用 `createHoverManager`
    - 导入并使用 `createEventHandlers`
    - 简化主组件为编排层
    - 确保 `onScopeDispose` 调用所有控制器的 `dispose` 方法
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 10. Checkpoint - 验证功能完整性
  - 运行现有属性测试验证兼容性
  - 运行 `pnpm run test` 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户
  - _Requirements: 8.5_

- [x] 11. 最终验证
  - [x] 11.1 运行完整测试套件
    - 运行 `pnpm run test` 验证所有测试通过
    - 运行 `pnpm run typecheck` 验证类型正确性
    - 运行 `pnpm run lint` 验证代码风格
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Notes

- 所有任务均为必需，确保全面测试覆盖
- 每个任务都引用了具体的需求条款以便追溯
- Checkpoint 任务用于增量验证，确保重构过程中不引入回归
- 属性测试验证通用正确性属性，单元测试验证具体边界条件
