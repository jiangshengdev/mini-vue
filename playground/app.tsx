import type { SetupComponent } from '@/index.ts'
import { effect, RouterLink, RouterView, state } from '@/index.ts'

// 桌面端断点宽度
const DESKTOP_BREAKPOINT = 768

/**
 * NavLinks 组件属性
 */
interface NavLinksProps {
  /** 点击链接时的回调 */
  onLinkClick?: () => void
}

/**
 * 导航链接组件 - 供桌面端导航和移动端抽屉共用
 */
const NavLinks: SetupComponent<NavLinksProps> = (props) => {
  return () => (
    <>
      <RouterLink class="nav-link" to="/" onClick={props.onLinkClick}>
        首页
      </RouterLink>
      <RouterLink class="nav-link" to="/counter" onClick={props.onLinkClick}>
        计数器
      </RouterLink>
      <RouterLink class="nav-link" to="/lis-visualization" onClick={props.onLinkClick}>
        LIS 可视化
      </RouterLink>
      <div class="nav-group">
        <RouterLink class="nav-link" to="/basic" onClick={props.onLinkClick}>
          基础示例
        </RouterLink>
        <div class="nav-sub">
          <RouterLink class="nav-link nav-sub-link" to="/basic/hello-world" onClick={props.onLinkClick}>
            你好，世界
          </RouterLink>
          <RouterLink class="nav-link nav-sub-link" to="/basic/handling-user-input" onClick={props.onLinkClick}>
            处理用户输入
          </RouterLink>
          <RouterLink class="nav-link nav-sub-link" to="/basic/attribute-bindings" onClick={props.onLinkClick}>
            属性绑定
          </RouterLink>
          <RouterLink class="nav-link nav-sub-link" to="/basic/conditionals-and-loops" onClick={props.onLinkClick}>
            条件与循环
          </RouterLink>
          <RouterLink class="nav-link nav-sub-link" to="/basic/form-bindings" onClick={props.onLinkClick}>
            表单绑定
          </RouterLink>
          <RouterLink class="nav-link nav-sub-link" to="/basic/simple-component" onClick={props.onLinkClick}>
            简单组件
          </RouterLink>
        </div>
      </div>
    </>
  )
}

export const App: SetupComponent = () => {
  // 抽屉导航的开关状态
  const isDrawerOpen = state(false)

  // 打开抽屉（保留以备扩展使用）
  const _openDrawer = (): void => {
    isDrawerOpen.set(true)
  }

  void _openDrawer

  // 关闭抽屉
  const closeDrawer = (): void => {
    isDrawerOpen.set(false)
  }

  // 切换抽屉状态
  const toggleDrawer = (): void => {
    isDrawerOpen.set(!isDrawerOpen.get())
  }

  // 处理键盘事件 - Escape 键关闭抽屉
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && isDrawerOpen.get()) {
      closeDrawer()
    }
  }

  // 处理窗口大小变化 - 桌面端尺寸时自动关闭抽屉
  const handleResize = (): void => {
    if (window.innerWidth >= DESKTOP_BREAKPOINT && isDrawerOpen.get()) {
      closeDrawer()
    }
  }

  // 使用 effect 管理事件监听器的生命周期
  effect(() => {
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    // 清理函数 - effect 停止时移除监听器
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  })

  return () => {
    const drawerOpen = isDrawerOpen.get()

    return (
      <>
        {/* 移动端头部区域 */}
        <header class="mobile-header">
          <button
            class="hamburger-btn"
            type="button"
            aria-label={drawerOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={drawerOpen}
            onClick={toggleDrawer}
          >
            <span class="hamburger-icon" />
          </button>
        </header>

        {/* 抽屉导航 */}
        <div class={`drawer-container ${drawerOpen ? 'open' : ''}`}>
          <div class="drawer-overlay" onClick={closeDrawer} />
          <nav class="drawer-nav" aria-expanded={drawerOpen}>
            <NavLinks onLinkClick={closeDrawer} />
          </nav>
        </div>

        {/* 主布局 */}
        <div class="layout">
          <nav class="nav">
            <NavLinks />
          </nav>
          <main class="main">
            <RouterView />
          </main>
        </div>
      </>
    )
  }
}
