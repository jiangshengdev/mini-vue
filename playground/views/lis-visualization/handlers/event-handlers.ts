/**
 * LIS 可视化 - 事件处理器工厂
 *
 * 创建所有 UI 事件处理函数，集中管理事件处理逻辑。
 * 通过依赖注入模式解耦事件处理与具体实现，便于测试和维护。
 */

import type { EventHandlers, EventHandlersDeps } from '../types.ts'

/**
 * 创建事件处理器集合。
 *
 * @remarks
 * - 所有事件处理器共享同一组依赖，通过闭包捕获状态管理器和控制器。
 * - 返回的处理器可直接绑定到 UI 组件的事件回调。
 *
 * @param deps - 事件处理器依赖项，包含状态管理器、导航器、播放控制器等
 * @returns 事件处理器集合，包含所有 UI 交互所需的回调函数
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
   * 处理输入数组变化。
   *
   * 当用户修改输入数组时，需要停止当前播放、更新输入状态并重置导航器，
   * 以便从新输入重新开始算法演示。
   */
  const handleInputChange = (newInput: number[]): void => {
    playbackController.stop()
    state.input.set(newInput)
    resetNavigator()
  }

  /**
   * 导航到上一步。
   *
   * 调用导航器的 `prev` 方法后同步更新步骤状态到 UI。
   */
  const handlePrevious = (): void => {
    getNavigator().prev()
    updateStep()
  }

  /**
   * 导航到下一步。
   *
   * 调用导航器的 `next` 方法后同步更新步骤状态到 UI。
   */
  const handleNext = (): void => {
    getNavigator().next()
    updateStep()
  }

  /**
   * 重置到初始状态。
   *
   * 停止播放并将导航器重置到第一步，用于用户想要重新观看演示的场景。
   */
  const handleReset = (): void => {
    playbackController.stop()
    getNavigator().reset()
    updateStep()
  }

  /**
   * 切换播放/暂停状态。
   *
   * 委托给播放控制器处理播放状态的切换逻辑。
   */
  const handleTogglePlay = (): void => {
    playbackController.toggle()
  }

  /**
   * 处理播放速度变化。
   *
   * 将新的播放速度传递给播放控制器，影响自动播放的步进间隔。
   */
  const handleSpeedChange = (newSpeed: number): void => {
    playbackController.updateSpeed(newSpeed)
  }

  /**
   * 处理数组索引点击，跳转到对应步骤。
   *
   * @remarks
   * 由于第 0 步是初始化状态（init），数组索引 `i` 对应的处理步骤是 `i + 1`。
   * 点击时需要先停止播放，避免自动播放与手动跳转冲突。
   */
  const handleIndexClick = (index: number): void => {
    playbackController.stop()
    getNavigator().goTo(index + 1)
    updateStep()
  }

  /**
   * 处理链视图的 hover 进入事件。
   *
   * 将 hover 的索引列表和链索引传递给 hover 管理器，用于高亮显示相关元素。
   */
  const handleChainHover = (indexes: number[], chainIndex: number): void => {
    hoverManager.handleChainHover(indexes, chainIndex)
  }

  /**
   * 处理链视图的 hover 离开事件。
   *
   * 清除链相关的 hover 高亮状态。
   */
  const handleChainLeave = (): void => {
    hoverManager.handleChainLeave()
  }

  /**
   * 处理 Sequence 区域的 hover 进入事件。
   *
   * 标记当前 hover 在序列区域，用于条件性显示相关信息。
   */
  const handleSequenceHover = (): void => {
    hoverManager.handleSequenceHover()
  }

  /**
   * 处理 Sequence 区域的 hover 离开事件。
   *
   * 清除序列区域的 hover 状态。
   */
  const handleSequenceLeave = (): void => {
    hoverManager.handleSequenceLeave()
  }

  /**
   * 处理 Predecessors 区域的 hover 进入事件。
   *
   * 标记当前 hover 在前驱区域，用于条件性显示相关信息。
   */
  const handlePredecessorsHover = (): void => {
    hoverManager.handlePredecessorsHover()
  }

  /**
   * 处理 Predecessors 区域的 hover 离开事件。
   *
   * 清除前驱区域的 hover 状态。
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
