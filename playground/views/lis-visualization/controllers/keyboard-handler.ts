/**
 * LIS 可视化 - 键盘处理器模块
 *
 * 负责管理全局键盘事件监听，处理所有快捷键
 */

import type { KeyboardHandler, KeyboardHandlerActions } from '../types.ts'

/**
 * 检查当前焦点是否在输入元素内
 * 如果焦点在输入框、文本域或可编辑元素内，应忽略快捷键
 */
function isInputFocused(target: EventTarget | undefined): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const { tagName } = target

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable
}

/**
 * 创建键盘处理器
 *
 * @param actions - 键盘动作回调集合
 * @returns 键盘处理器实例
 */
export function createKeyboardHandler(actions: KeyboardHandlerActions): KeyboardHandler {
  const { onPrevious, onNext, onReset, onGoToEnd, onTogglePlay, onSpeedUp, onSpeedDown } = actions

  /**
   * 键盘事件处理函数
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    // 如果焦点在输入元素内，不触发快捷键
    if (isInputFocused(event.target ?? undefined)) {
      return
    }

    const { key } = event

    // ArrowLeft: 上一步
    if (key === 'ArrowLeft') {
      event.preventDefault()
      onPrevious()

      return
    }

    // ArrowRight: 下一步
    if (key === 'ArrowRight') {
      event.preventDefault()
      onNext()

      return
    }

    // Home: 重置到初始状态
    if (key === 'Home') {
      event.preventDefault()
      onReset()

      return
    }

    // End: 跳转到最后一步
    if (key === 'End') {
      event.preventDefault()
      onGoToEnd()

      return
    }

    // Space: 切换播放状态
    if (key === ' ') {
      event.preventDefault()
      onTogglePlay()

      return
    }

    // + 或 =: 加速（减少间隔）
    if (key === '+' || key === '=') {
      event.preventDefault()
      onSpeedUp()

      return
    }

    // - 或 _: 减速（增加间隔）
    if (key === '-' || key === '_') {
      event.preventDefault()
      onSpeedDown()
    }
  }

  return {
    register(): void {
      globalThis.addEventListener('keydown', handleKeyDown)
    },

    dispose(): void {
      globalThis.removeEventListener('keydown', handleKeyDown)
    },
  }
}
