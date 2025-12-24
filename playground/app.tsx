import type { SetupComponent } from '@/index.ts'
import { onScopeDispose, RouterLink, RouterView, state } from '@/index.ts'

// 桌面端断点宽度
const desktopBreakpoint = 768

/**
 * 导航链接配置
 */
interface NavLinkConfig {
  to: string
  label: string
  children?: NavLinkConfig[]
}

/**
 * 导航链接数据
 */
const navLinks: NavLinkConfig[] = [
  { to: '/', label: '首页' },
  { to: '/counter', label: '计数器' },
  { to: '/lis-visualization', label: 'LIS 可视化' },
  {
    to: '/basic',
    label: '基础示例',
    children: [
      { to: '/basic/hello-world', label: '你好，世界' },
      { to: '/basic/handling-user-input', label: '处理用户输入' },
      { to: '/basic/attribute-bindings', label: '属性绑定' },
      { to: '/basic/conditionals-and-loops', label: '条件与循环' },
      { to: '/basic/form-bindings', label: '表单绑定' },
      { to: '/basic/simple-component', label: '简单组件' },
    ],
  },
]

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
  /**
   * 高阶组件：封装 RouterLink，自动注入 onClick 回调
   */
  const NavLink: SetupComponent<{ to: string; class?: string }> = (linkProps) => {
    return () => {
      return (
        <RouterLink
          class={linkProps.class ?? 'nav-link'}
          to={linkProps.to}
          onClick={props.onLinkClick}
        >
          {linkProps.children}
        </RouterLink>
      )
    }
  }

  return () => {
    return (
      <>
        {navLinks.map((link) => {
          return link.children ? (
            <div class="nav-group">
              <NavLink to={link.to}>{link.label}</NavLink>
              <div class="nav-sub">
                {link.children.map((child) => {
                  return (
                    <NavLink class="nav-link nav-sub-link" to={child.to}>
                      {child.label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ) : (
            <NavLink to={link.to}>{link.label}</NavLink>
          )
        })}
      </>
    )
  }
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
    if (window.innerWidth >= desktopBreakpoint && isDrawerOpen.get()) {
      closeDrawer()
    }
  }

  // 注册事件监听器
  document.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)

  // 使用 onScopeDispose 在组件卸载时清理事件监听器
  onScopeDispose(() => {
    document.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('resize', handleResize)
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
