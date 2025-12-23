# Implementation Plan: LIS Algorithm Visualization

## Overview

在 `playground/views/lis-visualization/` 目录下实现 LIS 算法的交互式可视化功能，依赖 `@/runtime-core` 中的 LIS 算法，提供步骤追踪、导航和 DOM 渲染。

## Tasks

- [x] 1. 项目结构和类型定义
  - [x] 1.1 创建 `playground/views/lis-visualization/` 目录结构
    - 创建 types.ts、trace.ts、navigator.ts 文件
    - 创建 components/ 和 styles/ 子目录
    - _Requirements: 7.2_

  - [x] 1.2 定义核心类型
    - 定义 StepAction、VisualizationStep、TraceResult 类型
    - 定义 NavigatorState、StepNavigator 接口
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [-] 2. 实现追踪函数
  - [x] 2.1 实现 traceLIS 函数
    - 复用 LIS 算法逻辑，在每次迭代时记录步骤
    - 捕获 sequence 和 predecessors 的深拷贝
    - 记录操作类型（append/replace/skip）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4_

  - [ ]\* 2.2 编写属性测试：追踪结果与原始算法一致
    - **Property 1: 追踪结果与原始算法一致**
    - **Validates: Requirements 3.2, 7.3**

  - [ ]\* 2.3 编写属性测试：步骤数量等于输入长度
    - **Property 2: 步骤数量等于输入长度**
    - **Validates: Requirements 1.1**

  - [ ]\* 2.4 编写属性测试：操作类型正确性
    - **Property 3: 操作类型正确性**
    - **Validates: Requirements 1.2, 1.3, 1.4**

  - [ ]\* 2.5 编写属性测试：深拷贝隔离
    - **Property 5: 深拷贝隔离**
    - **Validates: Requirements 2.1, 2.2**

- [x] 3. 实现步骤导航器
  - [x] 3.1 实现 createStepNavigator 函数
    - 实现 getState、getCurrentStep、next、prev、goTo、reset 方法
    - 管理当前步骤索引和边界状态
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]\* 3.2 编写属性测试：导航操作正确性
    - **Property 8: 导航操作正确性**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [ ]\* 3.3 编写属性测试：边界状态指示
    - **Property 9: 边界状态指示**
    - **Validates: Requirements 4.5, 4.6, 4.7**

- [x] 4. Checkpoint - 核心逻辑验证
  - 确保所有测试通过，ask the user if questions arise.

- [-] 5. 实现 UI 组件
  - [-] 5.1 实现 ArrayDisplay 组件
    - 显示输入数组，高亮当前处理的索引
    - 支持点击元素跳转到对应步骤
    - _Requirements: 5.1, 5.2_

  - [ ] 5.2 实现 SequenceGraph 组件
    - 显示 Sequence State 和 Predecessors 数组
    - 显示当前时刻的所有链表（Chain View）
    - 从 sequence 中的每个索引回溯 predecessors 构建链
    - _Requirements: 5.3_

  - [ ] 5.3 实现 ActionPanel 组件
    - 显示当前操作类型和详情
    - _Requirements: 5.4_

  - [ ] 5.4 实现 StepControls 组件
    - 实现 Prev/Next/Reset/Auto 按钮
    - 实现速度滑块
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 5.5 实现 InputEditor 组件
    - 允许用户编辑输入数组
    - 输入变化时重新计算追踪
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6. 实现主页面和路由
  - [ ] 6.1 实现 LISVisualization 主页面组件
    - 组合所有子组件
    - 管理响应式状态
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 6.2 添加路由配置
    - 在 playground/router/ 中添加 /lis-visualization 路由
    - _Requirements: 7.2_

  - [ ] 6.3 添加样式
    - 创建 visualization.module.css
    - 实现动画过渡效果
    - _Requirements: 5.5_

- [ ] 7. 实现键盘快捷键
  - [ ] 7.1 添加键盘事件监听
    - ←/→ 导航、Home/End 跳转、Space 播放/暂停
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Final Checkpoint - 完整功能验证
  - 确保所有测试通过，ask the user if questions arise.
  - 在浏览器中手动验证可视化功能

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 核心逻辑（trace、navigator）优先实现和测试
- UI 组件布局仅供参考，实际以实现时为准
- 属性测试使用 fast-check，每个测试至少 100 次迭代
