# Implementation Plan: Mobile Responsive Navigation

## Overview

为 playground 添加移动端响应式导航功能，包括汉堡菜单按钮、抽屉式导航和响应式样式。

## Tasks

- [x] 1. 添加响应式 CSS 样式
  - [x] 1.1 在 router.css 中添加移动端媒体查询和响应式布局样式
    - 添加 768px 断点的媒体查询
    - 移动端隐藏 `.nav`，桌面端显示
    - 移动端单列布局，内容区占满宽度
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 添加汉堡按钮样式
    - 创建 `.hamburger-btn` 和 `.hamburger-icon` 样式
    - 移动端显示，桌面端隐藏
    - 三横线图标样式（使用 CSS 伪元素）
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 1.3 添加抽屉导航和遮罩层样式
    - 创建 `.drawer-container`、`.drawer-overlay`、`.drawer-nav` 样式
    - 抽屉从左侧滑入的 transform 动画
    - 遮罩层淡入淡出动画
    - 动画持续时间 250ms
    - z-index 层级设置
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3_

- [x] 2. 重构 App 组件，添加移动端导航功能
  - [x] 2.1 提取 NavLinks 组件
    - 将导航链接提取为独立组件
    - 支持 onLinkClick 回调属性
    - _Requirements: 3.5_

  - [x] 2.2 添加抽屉状态管理和事件处理
    - 使用 state() 创建 isDrawerOpen 状态
    - 实现 openDrawer、closeDrawer、toggleDrawer 函数
    - 添加 Escape 键监听，打开时按 Escape 关闭抽屉
    - 添加窗口 resize 监听，桌面端尺寸时自动关闭抽屉
    - _Requirements: 2.3, 3.3, 3.4, 5.3_

  - [x] 2.3 实现汉堡按钮和抽屉导航 JSX
    - 添加移动端头部区域和汉堡按钮
    - 添加抽屉容器、遮罩层和抽屉导航
    - 设置 aria-label 和 aria-expanded 属性
    - 绑定点击事件处理
    - _Requirements: 2.3, 3.3, 3.4, 5.1, 5.2_

- [ ] 3. Checkpoint - 手动验证基本功能
  - 运行 `pnpm run play` 启动 playground
  - 调整浏览器窗口宽度，验证响应式切换
  - 测试汉堡按钮点击、遮罩点击、链接点击、Escape 键
  - 确保所有功能正常工作，如有问题请反馈

- [x] 4. 添加属性测试
  - [x] 4.1 创建抽屉状态切换的属性测试文件
    - **Property 3: 点击汉堡按钮切换抽屉状态**
    - **Validates: Requirements 2.3**

  - [x] 4.2 添加遮罩层和 aria 属性的属性测试
    - **Property 4: 抽屉打开时遮罩层可见**
    - **Property 7: aria-expanded 属性与抽屉状态一致**
    - **Validates: Requirements 3.2, 5.2**

- [x]\* 5. 添加单元测试
  - [x]\* 5.1 添加状态管理函数的单元测试
    - 测试 toggleDrawer 切换状态
    - 测试 openDrawer 和 closeDrawer 设置正确状态
    - _Requirements: 2.3, 3.3_

  - [x]\* 5.2 添加键盘事件处理的单元测试
    - 测试 Escape 键在抽屉打开时关闭抽屉
    - 测试 Escape 键在抽屉关闭时无效果
    - _Requirements: 5.3_

- [x] 6. Final Checkpoint - 确保所有测试通过
  - 运行 `pnpm run test` 确保所有测试通过
  - 如有问题请反馈

## Notes

- 任务标记 `*` 的为可选任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求条目以便追溯
- 属性测试验证通用正确性属性，单元测试验证具体边界情况
- **CSS 颜色必须使用变量**：所有颜色值必须使用 `main.css` 中 `:root` 定义的 CSS 变量（如 `var(--color-bg-primary)`），禁止硬编码颜色值
