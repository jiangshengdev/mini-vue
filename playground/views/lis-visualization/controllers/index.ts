/**
 * LIS 可视化 - 控制器模块导出
 *
 * 导出所有控制器创建函数和相关类型
 */

// 控制器创建函数
export { createHoverManager } from './hover-manager.ts'
export { createKeyboardHandler } from './keyboard-handler.ts'
export { createPlaybackController } from './playback-controller.ts'
export { createStateManager } from './state-manager.ts'

// 相关类型（从 types.ts 重新导出）
export type {
  Disposable,
  HoverManager,
  HoverManagerDeps,
  KeyboardHandler,
  KeyboardHandlerActions,
  PlaybackController,
  PlaybackControllerDeps,
  StateManager,
  StateRef,
  VisualizationState,
} from '../types.ts'
