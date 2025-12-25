/**
 * 抽屉导航状态管理模块
 *
 * 提供抽屉导航的状态管理功能，包括打开、关闭、切换状态等操作。
 * 该模块被提取为独立模块以便于测试。
 */

import { state } from '@/index.ts'
import type { State } from '@/index.ts'

/**
 * 桌面端断点宽度
 */
export const desktopBreakpoint = 768

/**
 * 抽屉状态管理器接口
 */
export interface DrawerStateManager {
  /** 抽屉是否打开的状态 */
  isOpen: State<boolean>
  /** 打开抽屉 */
  open: () => void
  /** 关闭抽屉 */
  close: () => void
  /** 切换抽屉状态 */
  toggle: () => void
}

/**
 * 创建抽屉状态管理器
 *
 * @param initialOpen - 初始打开状态，默认为 false
 * @returns 抽屉状态管理器实例
 */
export function createDrawerStateManager(initialOpen = false): DrawerStateManager {
  const isOpen = state(initialOpen)

  const open = (): void => {
    isOpen.set(true)
  }

  const close = (): void => {
    isOpen.set(false)
  }

  const toggle = (): void => {
    isOpen.set(!isOpen.get())
  }

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}

/**
 * 处理键盘事件 - Escape 键关闭抽屉
 *
 * @param event - 键盘事件
 * @param manager - 抽屉状态管理器
 * @returns 是否处理了该事件
 */
export function handleEscapeKey(event: KeyboardEvent, manager: DrawerStateManager): boolean {
  if (event.key === 'Escape' && manager.isOpen.get()) {
    manager.close()

    return true
  }

  return false
}

/**
 * 处理窗口大小变化 - 桌面端尺寸时自动关闭抽屉
 *
 * @param windowWidth - 当前窗口宽度
 * @param manager - 抽屉状态管理器
 * @returns 是否关闭了抽屉
 */
export function handleWindowResize(windowWidth: number, manager: DrawerStateManager): boolean {
  if (windowWidth >= desktopBreakpoint && manager.isOpen.get()) {
    manager.close()

    return true
  }

  return false
}

/**
 * 获取汉堡按钮的 aria-label
 *
 * @param isOpen - 抽屉是否打开
 * @returns aria-label 字符串
 */
export function getHamburgerAriaLabel(isOpen: boolean): string {
  return isOpen ? '关闭导航菜单' : '打开导航菜单'
}
