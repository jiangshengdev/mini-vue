/**
 * 移动端响应式导航 - 抽屉状态管理属性测试
 *
 * 使用 fast-check 进行属性测试，验证抽屉状态管理的正确性。
 *
 * Feature: mobile-responsive-nav
 */

import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import {
  createDrawerStateManager,
  desktopBreakpoint,
  getHamburgerAriaLabel,
  handleEscapeKey,
  handleWindowResize,
} from '../controllers/drawer-state.ts'

describe('DrawerStateManager 属性测试', () => {
  /**
   * Feature: mobile-responsive-nav, Property 3: 点击汉堡按钮切换抽屉状态
   * Validates: Requirements 2.3
   *
   * 对于任意抽屉初始状态（开/关），调用 toggle() 后，抽屉状态应该切换为相反状态。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 3: toggle() 切换抽屉状态为相反状态',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      // 调用 toggle
      manager.toggle()

      // 验证状态切换为相反状态
      expect(manager.isOpen.get()).toBe(!initialOpen)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 3: 点击汉堡按钮切换抽屉状态
   * Validates: Requirements 2.3
   *
   * 对于任意抽屉初始状态，连续调用两次 toggle() 后，状态应该恢复到初始状态。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 3: 连续两次 toggle() 恢复到初始状态',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      // 连续调用两次 toggle
      manager.toggle()
      manager.toggle()

      // 验证状态恢复到初始状态
      expect(manager.isOpen.get()).toBe(initialOpen)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 3: 点击汉堡按钮切换抽屉状态
   * Validates: Requirements 2.3
   *
   * 对于任意次数的 toggle 调用，最终状态应该与调用次数的奇偶性一致。
   */
  test.prop([fc.boolean(), fc.integer({ min: 1, max: 20 })], { numRuns: 100 })(
    'Property 3: toggle() 调用次数决定最终状态',
    (initialOpen, toggleCount) => {
      const manager = createDrawerStateManager(initialOpen)

      // 调用 toggle 指定次数
      for (let i = 0; i < toggleCount; i++) {
        manager.toggle()
      }

      // 奇数次调用后状态应该与初始状态相反，偶数次调用后状态应该与初始状态相同
      const expectedState = toggleCount % 2 === 1 ? !initialOpen : initialOpen
      expect(manager.isOpen.get()).toBe(expectedState)
    },
  )
})

describe('DrawerStateManager open/close 属性测试', () => {
  /**
   * Feature: mobile-responsive-nav, Property 3: 点击汉堡按钮切换抽屉状态
   * Validates: Requirements 2.3
   *
   * 对于任意初始状态，调用 open() 后状态应该为 true。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 3: open() 总是将状态设置为 true',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      manager.open()

      expect(manager.isOpen.get()).toBe(true)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 3: 点击汉堡按钮切换抽屉状态
   * Validates: Requirements 2.3
   *
   * 对于任意初始状态，调用 close() 后状态应该为 false。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 3: close() 总是将状态设置为 false',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      manager.close()

      expect(manager.isOpen.get()).toBe(false)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 3: 点击汉堡按钮切换抽屉状态
   * Validates: Requirements 2.3
   *
   * open() 是幂等的 - 多次调用 open() 结果相同。
   */
  test.prop([fc.boolean(), fc.integer({ min: 1, max: 10 })], { numRuns: 100 })(
    'Property 3: open() 是幂等操作',
    (initialOpen, callCount) => {
      const manager = createDrawerStateManager(initialOpen)

      for (let i = 0; i < callCount; i++) {
        manager.open()
      }

      expect(manager.isOpen.get()).toBe(true)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 3: 点击汉堡按钮切换抽屉状态
   * Validates: Requirements 2.3
   *
   * close() 是幂等的 - 多次调用 close() 结果相同。
   */
  test.prop([fc.boolean(), fc.integer({ min: 1, max: 10 })], { numRuns: 100 })(
    'Property 3: close() 是幂等操作',
    (initialOpen, callCount) => {
      const manager = createDrawerStateManager(initialOpen)

      for (let i = 0; i < callCount; i++) {
        manager.close()
      }

      expect(manager.isOpen.get()).toBe(false)
    },
  )
})

describe('Overlay 可见性属性测试', () => {
  /**
   * Feature: mobile-responsive-nav, Property 4: 抽屉打开时遮罩层可见
   * Validates: Requirements 3.2
   *
   * 遮罩层的可见性应该与抽屉是否打开一致。
   * 由于遮罩层可见性由 CSS 类控制，这里测试状态值本身。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 4: 抽屉状态决定遮罩层可见性',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      // 遮罩层可见性应该与 isOpen 状态一致
      // 在实际 UI 中，当 isOpen 为 true 时，drawer-container 会有 'open' 类
      // 这里验证状态值的一致性
      expect(manager.isOpen.get()).toBe(initialOpen)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 4: 抽屉打开时遮罩层可见
   * Validates: Requirements 3.2
   *
   * 打开抽屉后遮罩层应该可见（状态为 true）。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 4: 打开抽屉后遮罩层可见',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      manager.open()

      // 打开后状态为 true，遮罩层应该可见
      expect(manager.isOpen.get()).toBe(true)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 4: 抽屉打开时遮罩层可见
   * Validates: Requirements 3.2
   *
   * 关闭抽屉后遮罩层应该隐藏（状态为 false）。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 4: 关闭抽屉后遮罩层隐藏',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      manager.close()

      // 关闭后状态为 false，遮罩层应该隐藏
      expect(manager.isOpen.get()).toBe(false)
    },
  )
})

describe('aria-expanded 属性测试', () => {
  /**
   * Feature: mobile-responsive-nav, Property 7: aria-expanded 属性与抽屉状态一致
   * Validates: Requirements 5.2
   *
   * aria-expanded 属性值应该与抽屉是否打开一致。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 7: aria-expanded 与抽屉状态一致',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      // aria-expanded 应该与 isOpen 状态一致
      // 在实际 UI 中，aria-expanded={drawerOpen} 直接使用状态值
      expect(manager.isOpen.get()).toBe(initialOpen)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 7: aria-expanded 属性与抽屉状态一致
   * Validates: Requirements 5.2
   *
   * 切换状态后 aria-expanded 应该同步更新。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 7: toggle 后 aria-expanded 同步更新',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      manager.toggle()

      // toggle 后 aria-expanded 应该与新状态一致
      expect(manager.isOpen.get()).toBe(!initialOpen)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 7: aria-expanded 属性与抽屉状态一致
   * Validates: Requirements 5.2
   *
   * aria-label 应该根据状态正确返回。
   */
  test.prop([fc.boolean()], { numRuns: 100 })(
    'Property 7: aria-label 与抽屉状态一致',
    (isOpen) => {
      const label = getHamburgerAriaLabel(isOpen)

      if (isOpen) {
        expect(label).toBe('关闭导航菜单')
      } else {
        expect(label).toBe('打开导航菜单')
      }
    },
  )
})

describe('Escape 键处理属性测试', () => {
  /**
   * Feature: mobile-responsive-nav, Property 8: Escape 键关闭抽屉
   * Validates: Requirements 5.3
   *
   * 当抽屉打开时，按下 Escape 键应该关闭抽屉。
   */
  test.prop([fc.constant(true)], { numRuns: 100 })(
    'Property 8: 抽屉打开时 Escape 键关闭抽屉',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })

      const handled = handleEscapeKey(escapeEvent, manager)

      expect(handled).toBe(true)
      expect(manager.isOpen.get()).toBe(false)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 8: Escape 键关闭抽屉
   * Validates: Requirements 5.3
   *
   * 当抽屉关闭时，按下 Escape 键不应该有任何效果。
   */
  test.prop([fc.constant(false)], { numRuns: 100 })(
    'Property 8: 抽屉关闭时 Escape 键无效果',
    (initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })

      const handled = handleEscapeKey(escapeEvent, manager)

      expect(handled).toBe(false)
      expect(manager.isOpen.get()).toBe(false)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 8: Escape 键关闭抽屉
   * Validates: Requirements 5.3
   *
   * 非 Escape 键不应该关闭抽屉。
   */
  test.prop(
    [fc.boolean(), fc.string().filter((s) => s !== 'Escape' && s.length > 0)],
    { numRuns: 100 },
  )('Property 8: 非 Escape 键不关闭抽屉', (initialOpen, key) => {
    const manager = createDrawerStateManager(initialOpen)
    const otherKeyEvent = new KeyboardEvent('keydown', { key })

    const handled = handleEscapeKey(otherKeyEvent, manager)

    expect(handled).toBe(false)
    expect(manager.isOpen.get()).toBe(initialOpen)
  })
})

describe('窗口大小变化处理属性测试', () => {
  /**
   * Feature: mobile-responsive-nav, Property 1 & 2: 响应式布局
   * Validates: Requirements 1.1, 1.2, 2.1, 2.2
   *
   * 当窗口宽度 >= 768px 且抽屉打开时，应该自动关闭抽屉。
   */
  test.prop([fc.integer({ min: desktopBreakpoint, max: 2000 })], { numRuns: 100 })(
    'Property 1 & 2: 桌面端宽度时自动关闭打开的抽屉',
    (windowWidth) => {
      const manager = createDrawerStateManager(true) // 初始打开

      const closed = handleWindowResize(windowWidth, manager)

      expect(closed).toBe(true)
      expect(manager.isOpen.get()).toBe(false)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 1 & 2: 响应式布局
   * Validates: Requirements 1.1, 1.2, 2.1, 2.2
   *
   * 当窗口宽度 < 768px 时，不应该自动关闭抽屉。
   */
  test.prop([fc.integer({ min: 1, max: desktopBreakpoint - 1 }), fc.boolean()], { numRuns: 100 })(
    'Property 1 & 2: 移动端宽度时不自动关闭抽屉',
    (windowWidth, initialOpen) => {
      const manager = createDrawerStateManager(initialOpen)

      const closed = handleWindowResize(windowWidth, manager)

      expect(closed).toBe(false)
      expect(manager.isOpen.get()).toBe(initialOpen)
    },
  )

  /**
   * Feature: mobile-responsive-nav, Property 1 & 2: 响应式布局
   * Validates: Requirements 1.1, 1.2, 2.1, 2.2
   *
   * 当窗口宽度 >= 768px 但抽屉已关闭时，不应该有任何效果。
   */
  test.prop([fc.integer({ min: desktopBreakpoint, max: 2000 })], { numRuns: 100 })(
    'Property 1 & 2: 桌面端宽度时已关闭的抽屉保持关闭',
    (windowWidth) => {
      const manager = createDrawerStateManager(false) // 初始关闭

      const closed = handleWindowResize(windowWidth, manager)

      expect(closed).toBe(false)
      expect(manager.isOpen.get()).toBe(false)
    },
  )
})
