# Design Document: Mobile Responsive Navigation

## Overview

为 playground 应用添加移动端响应式导航功能。在小屏幕设备上，将左侧固定导航替换为汉堡菜单 + 抽屉式导航的交互模式，提供更好的移动端用户体验。

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              MobileHeader (移动端)               │   │
│  │  ┌─────────────┐                                │   │
│  │  │ HamburgerBtn│                                │   │
│  │  └─────────────┘                                │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │                   Layout                         │   │
│  │  ┌──────────┐  ┌────────────────────────────┐   │   │
│  │  │   Nav    │  │          Main              │   │   │
│  │  │(桌面端)  │  │       RouterView           │   │   │
│  │  └──────────┘  └────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │           DrawerNavigation (移动端)              │   │
│  │  ┌──────────┐  ┌────────────────────────────┐   │   │
│  │  │  Overlay │  │      NavContent            │   │   │
│  │  └──────────┘  └────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 响应式策略

- **断点**: 768px（标准平板/手机分界点）
- **桌面端 (≥768px)**: 显示左侧固定导航，隐藏汉堡按钮和抽屉
- **移动端 (<768px)**: 隐藏左侧导航，显示顶部汉堡按钮，点击打开抽屉导航

## Components and Interfaces

### 状态管理

```typescript
// 抽屉导航的开关状态
const isDrawerOpen = state(false)

// 打开抽屉
const openDrawer = (): void => {
  isDrawerOpen.set(true)
}

// 关闭抽屉
const closeDrawer = (): void => {
  isDrawerOpen.set(false)
}

// 切换抽屉状态
const toggleDrawer = (): void => {
  isDrawerOpen.set(!isDrawerOpen.get())
}
```

### 组件结构

#### NavLinks 组件（共享导航链接）

提取导航链接为独立组件，供桌面端导航和移动端抽屉共用：

```typescript
interface NavLinksProps {
  onLinkClick?: () => void
}

const NavLinks: SetupComponent<NavLinksProps> = (props) => {
  return () => (
    <>
      <RouterLink class="nav-link" to="/" onClick={props.onLinkClick}>
        首页
      </RouterLink>
      {/* ... 其他链接 */}
    </>
  )
}
```

#### HamburgerButton 组件

```typescript
interface HamburgerButtonProps {
  isOpen: boolean
  onClick: () => void
}

const HamburgerButton: SetupComponent<HamburgerButtonProps> = (props) => {
  return () => (
    <button
      class="hamburger-btn"
      type="button"
      aria-label={props.isOpen ? '关闭导航菜单' : '打开导航菜单'}
      aria-expanded={props.isOpen}
      onClick={props.onClick}
    >
      <span class="hamburger-icon" />
    </button>
  )
}
```

#### DrawerNavigation 组件

```typescript
interface DrawerNavigationProps {
  isOpen: boolean
  onClose: () => void
}

const DrawerNavigation: SetupComponent<DrawerNavigationProps> = (props) => {
  return () => (
    <div class={`drawer-container ${props.isOpen ? 'open' : ''}`}>
      <div class="drawer-overlay" onClick={props.onClose} />
      <nav class="drawer-nav" aria-expanded={props.isOpen}>
        <NavLinks onLinkClick={props.onClose} />
      </nav>
    </div>
  )
}
```

### 键盘事件处理

```typescript
// 在 App 组件中监听 Escape 键
const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isDrawerOpen.get()) {
    closeDrawer()
  }
}

// 组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
```

## Data Models

本功能不涉及复杂的数据模型，主要状态为：

```typescript
// 抽屉开关状态
type DrawerState = boolean
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: 导航可见性与屏幕宽度一致性

_For any_ 屏幕宽度值，左侧固定导航的可见性应该与宽度是否 >= 768px 一致（宽度 >= 768px 时可见，否则隐藏）。

**Validates: Requirements 1.1, 1.2**

### Property 2: 汉堡按钮可见性与屏幕宽度一致性

_For any_ 屏幕宽度值，汉堡按钮的可见性应该与宽度是否 < 768px 一致（宽度 < 768px 时可见，否则隐藏）。

**Validates: Requirements 2.1, 2.2**

### Property 3: 点击汉堡按钮切换抽屉状态

_For any_ 抽屉初始状态（开/关），点击汉堡按钮后，抽屉状态应该切换为相反状态。

**Validates: Requirements 2.3**

### Property 4: 抽屉打开时遮罩层可见

_For any_ 抽屉状态，遮罩层的可见性应该与抽屉是否打开一致。

**Validates: Requirements 3.2**

### Property 5: 点击遮罩层关闭抽屉

_For any_ 打开状态的抽屉，点击遮罩层后，抽屉应该关闭。

**Validates: Requirements 3.3**

### Property 6: 点击导航链接关闭抽屉

_For any_ 打开状态的抽屉和任意导航链接，点击该链接后，抽屉应该关闭。

**Validates: Requirements 3.4**

### Property 7: aria-expanded 属性与抽屉状态一致

_For any_ 抽屉状态，抽屉导航元素的 aria-expanded 属性值应该与抽屉是否打开一致。

**Validates: Requirements 5.2**

### Property 8: Escape 键关闭抽屉

_For any_ 打开状态的抽屉，按下 Escape 键后，抽屉应该关闭。

**Validates: Requirements 5.3**

## Error Handling

### 边界情况

1. **快速连续点击**: 使用状态管理确保状态一致性，避免动画冲突
2. **窗口大小变化**: 当窗口从移动端尺寸调整到桌面端尺寸时，自动关闭抽屉
3. **路由变化**: 导航到新页面时自动关闭抽屉

### 错误恢复

- 如果动画执行失败，确保最终状态正确（通过 CSS class 控制而非 JS 动画）
- 事件监听器在组件卸载时正确清理，避免内存泄漏

## Testing Strategy

### 单元测试

使用 Vitest 进行单元测试：

1. **状态切换测试**: 验证 `toggleDrawer`、`openDrawer`、`closeDrawer` 函数正确更新状态
2. **键盘事件测试**: 验证 Escape 键正确触发关闭逻辑
3. **可访问性属性测试**: 验证 aria-label 和 aria-expanded 属性正确设置

### 属性测试

使用 fast-check 进行属性测试：

- 每个属性测试运行至少 100 次迭代
- 测试标签格式: **Feature: mobile-responsive-nav, Property {number}: {property_text}**

### 浏览器测试

使用 Vitest Browser Mode (Playwright) 进行 DOM 交互测试：

1. **响应式布局测试**: 设置不同视口宽度，验证元素可见性
2. **用户交互测试**: 模拟点击和键盘事件，验证抽屉行为
3. **动画测试**: 验证 CSS transition 属性正确应用

### CSS 样式测试

验证关键 CSS 属性：

1. 媒体查询断点正确设置为 768px
2. 动画持续时间在 200ms-300ms 范围内
3. z-index 层级正确（遮罩层 > 内容，抽屉 > 遮罩层）
