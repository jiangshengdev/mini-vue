/**
 * LIS 可视化 - 事件处理器工厂
 *
 * 创建所有 UI 事件处理函数，集中管理事件处理逻辑
 */

import type { EventHandlers, EventHandlersDeps } from '../types.ts'

/**
 * 创建事件处理器集合
 *
 * @param deps - 依赖项
 * @returns 事件处理器集合
 */
export function createEventHandlers(deps: EventHandlersDeps): EventHandlers {
  const {
    stateManager,
    getNavigator,
    playbackController,
    hoverManager,
    resetNavigator,
    updateStep,
  } = deps
  const state = stateManager.getState()

  /**
   * 输入变化处理
   *
   * 停止播放，更新输入数组，重置导航器
   */
  const handleInputChange = (newInput: number[]): void => {
    playbackController.stop()
    state.input.set(newInput)
    resetNavigator()
  }

  /**
   * 上一步
   */
  const handlePrevious = (): void => {
    getNavigator().prev()
    updateStep()
  }

  /**
   * 下一步
   */
  const handleNext = (): void => {
    getNavigator().next()
    updateStep()
  }

  /**
   * 重置到初始状态
   */
  const handleReset = (): void => {
    playbackController.stop()
    getNavigator().reset()
    updateStep()
  }

  /**
   * 切换播放状态
   */
  const handleTogglePlay = (): void => {
    playbackController.toggle()
  }

  /**
   * 速度变化处理
   */
  const handleSpeedChange = (newSpeed: number): void => {
    playbackController.updateSpeed(newSpeed)
  }

  /**
   * 索引点击处理
   *
   * 点击数组索引跳转到对应步骤
   * 第 0 步是 init，所以点击数组索引 i 应该跳转到步骤 i + 1
   */
  const handleIndexClick = (index: number): void => {
    playbackController.stop()
    getNavigator().goTo(index + 1)
    updateStep()
  }

  /**
   * 链 hover 进入
   */
  const handleChainHover = (indexes: number[], chainIndex: number): void => {
    hoverManager.handleChainHover(indexes, chainIndex)
  }

  /**
   * 链 hover 离开
   */
  const handleChainLeave = (): void => {
    hoverManager.handleChainLeave()
  }

  /**
   * Sequence 区域 hover 进入
   */
  const handleSequenceHover = (): void => {
    hoverManager.handleSequenceHover()
  }

  /**
   * Sequence 区域 hover 离开
   */
  const handleSequenceLeave = (): void => {
    hoverManager.handleSequenceLeave()
  }

  /**
   * Predecessors 区域 hover 进入
   */
  const handlePredecessorsHover = (): void => {
    hoverManager.handlePredecessorsHover()
  }

  /**
   * Predecessors 区域 hover 离开
   */
  const handlePredecessorsLeave = (): void => {
    hoverManager.handlePredecessorsLeave()
  }

  return {
    handleInputChange,
    handlePrevious,
    handleNext,
    handleReset,
    handleTogglePlay,
    handleSpeedChange,
    handleIndexClick,
    handleChainHover,
    handleChainLeave,
    handleSequenceHover,
    handleSequenceLeave,
    handlePredecessorsHover,
    handlePredecessorsLeave,
  }
}
