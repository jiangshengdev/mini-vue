# Implementation Plan: LIS Components Refactor

## Overview

本实现计划将 `playground/views/lis-visualization/components` 和 `styles` 目录进行重构。实现顺序遵循依赖关系：先创建工具模块，再创建子组件，最后更新主组件和样式。

## Tasks

- [x] 1. 创建工具模块
  - [x] 1.1 创建 `utils/chain-utils.ts`
    - 实现 `buildChain` 函数
    - 实现 `buildAllChains` 函数
    - 实现 `computeChangedNodesByChain` 函数
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 1.2 编写 chain-utils 属性测试
    - **Property 1: buildChain 返回完整的前驱链**
    - **Property 2: buildAllChains 返回正确数量的链**
    - **Validates: Requirements 2.3, 2.4**
  - [x] 1.3 创建 `utils/input-utils.ts`
    - 从 `input-editor.tsx` 提取 `parseInput` 函数
    - 从 `input-editor.tsx` 提取 `deduplicateInput` 函数
    - 从 `input-editor.tsx` 提取 `normalizeSequence` 函数
    - 从 `input-editor.tsx` 提取 `generateRandomSequence` 函数
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  - [x] 1.4 编写 input-utils 属性测试
    - **Property 3: parseInput 解析往返一致性**
    - **Property 4: deduplicateInput 保持首次出现**
    - **Property 5: normalizeSequence 映射为连续整数**
    - **Property 6: generateRandomSequence 返回有效归一化序列**
    - **Validates: Requirements 3.5, 3.6, 3.7, 3.8, 3.9**
  - [x] 1.5 创建 `utils/highlight-utils.ts`
    - 从 `sequence-graph.tsx` 提取 `getHighlightClass` 函数
    - 从 `sequence-graph.tsx` 提取 `getSecondaryHighlightClass` 函数
    - 从 `sequence-graph.tsx` 提取 `getSeqChangeIndicator` 函数
    - 从 `sequence-graph.tsx` 提取 `computeHighlightState` 函数
    - 从 `sequence-graph.tsx` 提取 `computePredecessorHighlight` 函数
    - 从 `sequence-graph.tsx` 提取 `computePredChangeIndicator` 函数
    - 从 `sequence-graph.tsx` 提取 `getNodeClassName` 函数
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 1.6 编写 highlight-utils 属性测试
    - **Property 7: 高亮函数纯函数性**
    - **Validates: Requirements 5.5, 5.6**
  - [x] 1.7 创建 `utils/index.ts`
    - 导出所有工具函数
    - _Requirements: 2.1, 3.1, 5.1_

- [x] 2. Checkpoint - 验证工具模块
  - 运行 `pnpm run typecheck` 验证类型正确性
  - 运行新增的属性测试
  - 确保所有测试通过，如有问题请询问用户

- [x] 3. 创建 SequenceGraph 子组件
  - [x] 3.1 创建 `components/sequence-graph/highlighted-array.tsx`
    - 实现 `HighlightedArray` 组件
    - 从 `sequence-graph.tsx` 提取 `renderHighlightedArray` 逻辑
    - _Requirements: 1.1_
  - [x] 3.2 创建 `components/sequence-graph/sequence-section.tsx`
    - 实现 `SequenceSection` 组件
    - 从 `sequence-graph.tsx` 提取 `renderSequenceSection` 逻辑
    - 使用 `HighlightedArray` 组件
    - _Requirements: 1.2_
  - [x] 3.3 创建 `components/sequence-graph/predecessor-section.tsx`
    - 实现 `PredecessorSection` 组件
    - 从 `sequence-graph.tsx` 提取 `renderPredecessorSection` 逻辑
    - 使用 `HighlightedArray` 组件
    - _Requirements: 1.3_
  - [x] 3.4 创建 `components/sequence-graph/chain-view.tsx`
    - 实现 `ChainView` 组件
    - 从 `sequence-graph.tsx` 提取 `renderChainView` 逻辑
    - _Requirements: 1.4_
  - [x] 3.5 创建 `components/sequence-graph/index.ts`
    - 导出所有子组件
    - _Requirements: 1.5_

- [x] 4. 重构主组件
  - [x] 4.1 重构 `components/sequence-graph.tsx`
    - 导入并使用子组件
    - 导入并使用工具函数
    - 简化为编排层
    - _Requirements: 1.1, 1.5, 1.6_
  - [x] 4.2 重构 `components/input-editor.tsx`
    - 导入并使用 `utils/input-utils.ts`
    - 移除内联的工具函数
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 4.3 更新 `components/index.ts`
    - 导出新增的子组件
    - 导出新增的类型
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 5. Checkpoint - 验证组件重构
  - 运行 `pnpm run typecheck` 验证类型正确性
  - 运行现有测试验证兼容性
  - 确保所有测试通过，如有问题请询问用户
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. 拆分样式文件
  - [x] 6.1 创建 `styles/shared.module.css`
    - 提取 CSS 变量定义
    - 提取动画定义
    - 提取通用工具类
    - _Requirements: 4.3_
  - [x] 6.2 创建 `styles/layout.module.css`
    - 提取页面布局样式
    - 提取 header/footer 样式
    - _Requirements: 4.1_
  - [x] 6.3 创建 `styles/array-display.module.css`
    - 提取数组显示相关样式
    - 导入共享样式
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 6.4 创建 `styles/sequence-graph.module.css`
    - 提取序列图相关样式
    - 导入共享样式
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 6.5 创建 `styles/action-panel.module.css`
    - 提取操作面板相关样式
    - 导入共享样式
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 6.6 创建 `styles/step-controls.module.css`
    - 提取步骤控制相关样式
    - 导入共享样式
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 6.7 创建 `styles/input-editor.module.css`
    - 提取输入编辑器相关样式
    - 导入共享样式
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 6.8 更新组件导入
    - 更新各组件的样式导入
    - _Requirements: 4.2_

- [x] 7. Checkpoint - 验证样式重构
  - 运行 `pnpm run typecheck` 验证类型正确性
  - 运行 `pnpm run lint` 验证代码风格
  - 确保所有测试通过，如有问题请询问用户
  - _Requirements: 4.5, 7.1_

- [x] 8. 最终验证
  - [x] 8.1 运行完整测试套件
    - 运行 `pnpm run test` 验证所有测试通过
    - 运行 `pnpm run typecheck` 验证类型正确性
    - 运行 `pnpm run lint` 验证代码风格
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

## Notes

- 所有任务均为必需，确保全面测试覆盖
- 每个任务都引用了具体的需求条款以便追溯
- Checkpoint 任务用于增量验证，确保重构过程中不引入回归
- 属性测试验证通用正确性属性，单元测试验证具体边界条件
