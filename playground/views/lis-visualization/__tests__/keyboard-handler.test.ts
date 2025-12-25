/**
 * LIS 算法可视化 - 键盘处理器单元测试
 *
 * 模拟键盘事件测试各快捷键和焦点检测逻辑。
 *
 * _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createKeyboardHandler } from '../controllers/keyboard-handler.ts'
import type { KeyboardHandlerActions } from '../types.ts'

/**
 * 创建模拟的键盘处理器动作
 */
function createMockActions(): KeyboardHandlerActions {
  return {
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onReset: vi.fn(),
    onGoToEnd: vi.fn(),
    onTogglePlay: vi.fn(),
    onSpeedUp: vi.fn(),
    onSpeedDown: vi.fn(),
  }
}

/**
 * 模拟键盘事件
 */
function dispatchKeyEvent(key: string, target?: EventTarget): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })

  // 如果提供了 target，需要模拟 event.target
  if (target) {
    Object.defineProperty(event, 'target', { value: target })
  }

  globalThis.dispatchEvent(event)

  return event
}

describe('createKeyboardHandler', () => {
  let actions: KeyboardHandlerActions

  beforeEach(() => {
    actions = createMockActions()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('register 和 dispose', () => {
    it('register 后应该响应键盘事件', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('ArrowLeft')

      expect(actions.onPrevious).toHaveBeenCalledTimes(1)

      handler.dispose()
    })

    it('dispose 后应该不再响应键盘事件', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      handler.dispose()

      dispatchKeyEvent('ArrowLeft')

      expect(actions.onPrevious).not.toHaveBeenCalled()
    })

    it('多次调用 dispose 应该是安全的', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      handler.dispose()
      handler.dispose()
      handler.dispose()

      // 不应该抛出错误
      dispatchKeyEvent('ArrowLeft')
      expect(actions.onPrevious).not.toHaveBeenCalled()
    })
  })

  describe('导航快捷键', () => {
    it('ArrowLeft 应该触发 onPrevious', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('ArrowLeft')

      expect(actions.onPrevious).toHaveBeenCalledTimes(1)

      handler.dispose()
    })

    it('ArrowRight 应该触发 onNext', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('ArrowRight')

      expect(actions.onNext).toHaveBeenCalledTimes(1)

      handler.dispose()
    })

    it('Home 应该触发 onReset', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('Home')

      expect(actions.onReset).toHaveBeenCalledTimes(1)

      handler.dispose()
    })

    it('End 应该触发 onGoToEnd', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('End')

      expect(actions.onGoToEnd).toHaveBeenCalledTimes(1)

      handler.dispose()
    })
  })

  describe('播放控制快捷键', () => {
    it('Space 应该触发 onTogglePlay', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent(' ')

      expect(actions.onTogglePlay).toHaveBeenCalledTimes(1)

      handler.dispose()
    })
  })

  describe('速度控制快捷键', () => {
    it('+ 应该触发 onSpeedUp', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('+')

      expect(actions.onSpeedUp).toHaveBeenCalledTimes(1)

      handler.dispose()
    })

    it('= 应该触发 onSpeedUp', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('=')

      expect(actions.onSpeedUp).toHaveBeenCalledTimes(1)

      handler.dispose()
    })

    it('- 应该触发 onSpeedDown', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('-')

      expect(actions.onSpeedDown).toHaveBeenCalledTimes(1)

      handler.dispose()
    })

    it('_ 应该触发 onSpeedDown', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('_')

      expect(actions.onSpeedDown).toHaveBeenCalledTimes(1)

      handler.dispose()
    })
  })

  describe('焦点检测逻辑', () => {
    it('焦点在 INPUT 元素时应该忽略快捷键', () => {
      const handler = createKeyboardHandler(actions)
      const inputElement = document.createElement('input')

      handler.register()
      dispatchKeyEvent('ArrowLeft', inputElement)

      expect(actions.onPrevious).not.toHaveBeenCalled()

      handler.dispose()
    })

    it('焦点在 TEXTAREA 元素时应该忽略快捷键', () => {
      const handler = createKeyboardHandler(actions)
      const textareaElement = document.createElement('textarea')

      handler.register()
      dispatchKeyEvent('ArrowRight', textareaElement)

      expect(actions.onNext).not.toHaveBeenCalled()

      handler.dispose()
    })

    it('焦点在 contentEditable 元素时应该忽略快捷键', () => {
      const handler = createKeyboardHandler(actions)
      const editableElement = document.createElement('div')

      // 直接模拟 isContentEditable 属性，因为 jsdom 对 contentEditable 的支持不完整
      Object.defineProperty(editableElement, 'isContentEditable', { value: true })

      handler.register()
      dispatchKeyEvent(' ', editableElement)

      expect(actions.onTogglePlay).not.toHaveBeenCalled()

      handler.dispose()
    })

    it('焦点在普通元素时应该响应快捷键', () => {
      const handler = createKeyboardHandler(actions)
      const divElement = document.createElement('div')

      handler.register()
      dispatchKeyEvent('ArrowLeft', divElement)

      expect(actions.onPrevious).toHaveBeenCalledTimes(1)

      handler.dispose()
    })
  })

  describe('未知按键处理', () => {
    it('未知按键应该被忽略', () => {
      const handler = createKeyboardHandler(actions)

      handler.register()
      dispatchKeyEvent('a')
      dispatchKeyEvent('Enter')
      dispatchKeyEvent('Escape')

      expect(actions.onPrevious).not.toHaveBeenCalled()
      expect(actions.onNext).not.toHaveBeenCalled()
      expect(actions.onReset).not.toHaveBeenCalled()
      expect(actions.onGoToEnd).not.toHaveBeenCalled()
      expect(actions.onTogglePlay).not.toHaveBeenCalled()
      expect(actions.onSpeedUp).not.toHaveBeenCalled()
      expect(actions.onSpeedDown).not.toHaveBeenCalled()

      handler.dispose()
    })
  })
})
