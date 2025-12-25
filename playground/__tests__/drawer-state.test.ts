/**
 * 移动端响应式导航 - 抽屉状态管理单元测试
 *
 * 测试抽屉状态管理的具体行为和边界情况。
 *
 * Feature: mobile-responsive-nav
 */

import { describe, expect, it } from 'vitest'
import {
  createDrawerStateManager,
  desktopBreakpoint,
  getHamburgerAriaLabel,
  handleEscapeKey,
  handleWindowResize,
} from '../controllers/drawer-state.ts'

describe('DrawerStateManager 单元测试', () => {
  describe('toggleDrawer 切换状态', () => {
    /**
     * Requirements: 2.3
     * 测试 toggleDrawer 从关闭状态切换到打开状态
     */
    it('从关闭状态切换到打开状态', () => {
      const manager = createDrawerStateManager(false)

      manager.toggle()

      expect(manager.isOpen.get()).toBe(true)
    })

    /**
     * Requirements: 2.3
     * 测试 toggleDrawer 从打开状态切换到关闭状态
     */
    it('从打开状态切换到关闭状态', () => {
      const manager = createDrawerStateManager(true)

      manager.toggle()

      expect(manager.isOpen.get()).toBe(false)
    })
  })

  describe('openDrawer 和 closeDrawer 设置正确状态', () => {
    /**
     * Requirements: 3.3
     * 测试 openDrawer 将状态设置为 true
     */
    it('openDrawer 将状态设置为 true', () => {
      const manager = createDrawerStateManager(false)

      manager.open()

      expect(manager.isOpen.get()).toBe(true)
    })

    /**
     * Requirements: 3.3
     * 测试 closeDrawer 将状态设置为 false
     */
    it('closeDrawer 将状态设置为 false', () => {
      const manager = createDrawerStateManager(true)

      manager.close()

      expect(manager.isOpen.get()).toBe(false)
    })

    /**
     * Requirements: 3.3
     * 测试 openDrawer 在已打开状态下保持打开
     */
    it('openDrawer 在已打开状态下保持打开', () => {
      const manager = createDrawerStateManager(true)

      manager.open()

      expect(manager.isOpen.get()).toBe(true)
    })

    /**
     * Requirements: 3.3
     * 测试 closeDrawer 在已关闭状态下保持关闭
     */
    it('closeDrawer 在已关闭状态下保持关闭', () => {
      const manager = createDrawerStateManager(false)

      manager.close()

      expect(manager.isOpen.get()).toBe(false)
    })
  })
})

describe('键盘事件处理单元测试', () => {
  describe('Escape 键在抽屉打开时关闭抽屉', () => {
    /**
     * Requirements: 5.3
     * 测试 Escape 键在抽屉打开时关闭抽屉
     */
    it('Escape 键关闭打开的抽屉', () => {
      const manager = createDrawerStateManager(true)
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })

      const handled = handleEscapeKey(escapeEvent, manager)

      expect(handled).toBe(true)
      expect(manager.isOpen.get()).toBe(false)
    })
  })

  describe('Escape 键在抽屉关闭时无效果', () => {
    /**
     * Requirements: 5.3
     * 测试 Escape 键在抽屉关闭时无效果
     */
    it('Escape 键不影响已关闭的抽屉', () => {
      const manager = createDrawerStateManager(false)
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })

      const handled = handleEscapeKey(escapeEvent, manager)

      expect(handled).toBe(false)
      expect(manager.isOpen.get()).toBe(false)
    })

    /**
     * Requirements: 5.3
     * 测试其他按键不关闭抽屉
     */
    it('其他按键不关闭抽屉', () => {
      const manager = createDrawerStateManager(true)
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })

      const handled = handleEscapeKey(enterEvent, manager)

      expect(handled).toBe(false)
      expect(manager.isOpen.get()).toBe(true)
    })
  })
})

describe('窗口大小变化处理单元测试', () => {
  /**
   * Requirements: 2.3
   * 测试桌面端宽度时自动关闭抽屉
   */
  it('桌面端宽度时自动关闭打开的抽屉', () => {
    const manager = createDrawerStateManager(true)

    const closed = handleWindowResize(desktopBreakpoint, manager)

    expect(closed).toBe(true)
    expect(manager.isOpen.get()).toBe(false)
  })

  /**
   * Requirements: 2.3
   * 测试移动端宽度时不关闭抽屉
   */
  it('移动端宽度时不关闭抽屉', () => {
    const manager = createDrawerStateManager(true)

    const closed = handleWindowResize(desktopBreakpoint - 1, manager)

    expect(closed).toBe(false)
    expect(manager.isOpen.get()).toBe(true)
  })

  /**
   * Requirements: 2.3
   * 测试断点值正确
   */
  it('断点值为 768px', () => {
    expect(desktopBreakpoint).toBe(768)
  })
})

describe('aria-label 单元测试', () => {
  /**
   * Requirements: 5.1
   * 测试抽屉关闭时的 aria-label
   */
  it('抽屉关闭时返回"打开导航菜单"', () => {
    const label = getHamburgerAriaLabel(false)

    expect(label).toBe('打开导航菜单')
  })

  /**
   * Requirements: 5.1
   * 测试抽屉打开时的 aria-label
   */
  it('抽屉打开时返回"关闭导航菜单"', () => {
    const label = getHamburgerAriaLabel(true)

    expect(label).toBe('关闭导航菜单')
  })
})
