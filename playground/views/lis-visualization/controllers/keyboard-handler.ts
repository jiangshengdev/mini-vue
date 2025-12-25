/**
 * LIS 可视化 - 键盘处理器模块
 *
 * 负责管理全局键盘事件监听，处理所有快捷键。
 *
 * @remarks
 * - 支持的快捷键：方向键导航、Home/End 跳转、空格播放、+/- 调速。
 * - 当焦点在输入元素内时自动忽略快捷键，避免干扰用户输入。
 * - 实现 `Disposable` 接口，确保组件卸载时移除事件监听。
 */

import type { KeyboardHandler, KeyboardHandlerActions } from '../types.ts'

/**
 * 检查当前焦点是否在输入元素内。
 *
 * @remarks
 * 如果焦点在输入框、文本域或可编辑元素内，应忽略快捷键以避免干扰用户输入。
 */
function isInputFocused(target: EventTarget | undefined): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const { tagName } = target

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable
}

/**
 * 创建键盘处理器，注册全局键盘事件监听。
 *
 * @remarks
 * - 通过 `actions` 参数注入各快捷键对应的回调函数，实现控制反转。
 * - 调用 `register()` 开始监听，调用 `dispose()` 停止监听。
 *
 * @param actions - 键盘动作回调集合
 * @returns 键盘处理器实例
 */
export function createKeyboardHandler(actions: KeyboardHandlerActions): KeyboardHandler {
  const { onPrevious, onNext, onReset, onGoToEnd, onTogglePlay, onSpeedUp, onSpeedDown } = actions

  /**
   * 键盘事件处理函数，根据按键分发到对应的动作回调。
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    /* 如果焦点在输入元素内，不触发快捷键。 */
    if (isInputFocused(event.target ?? undefined)) {
      return
    }

    const { key } = event

    /* ArrowLeft: 上一步 */
    if (key === 'ArrowLeft') {
      event.preventDefault()
      onPrevious()

      return
    }

    /* ArrowRight: 下一步 */
    if (key === 'ArrowRight') {
      event.preventDefault()
      onNext()

      return
    }

    /* Home: 重置到初始状态 */
    if (key === 'Home') {
      event.preventDefault()
      onReset()

      return
    }

    /* End: 跳转到最后一步 */
    if (key === 'End') {
      event.preventDefault()
      onGoToEnd()

      return
    }

    /* Space: 切换播放状态 */
    if (key === ' ') {
      event.preventDefault()
      onTogglePlay()

      return
    }

    /* + 或 =: 加速（减少间隔） */
    if (key === '+' || key === '=') {
      event.preventDefault()
      onSpeedUp()

      return
    }

    /* - 或 _: 减速（增加间隔） */
    if (key === '-' || key === '_') {
      event.preventDefault()
      onSpeedDown()
    }
  }

  return {
    /** 注册全局键盘事件监听。 */
    register(): void {
      globalThis.addEventListener('keydown', handleKeyDown)
    },

    /** 移除全局键盘事件监听，释放资源。 */
    dispose(): void {
      globalThis.removeEventListener('keydown', handleKeyDown)
    },
  }
}
