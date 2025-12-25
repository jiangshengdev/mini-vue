# Implementation Plan: Playground Code Review

## Overview

本任务列表定义了 playground 代码审查的执行步骤。审查工作按模块分组进行，每个模块生成独立报告，最终汇总所有发现。

## Tasks

- [ ] 1. 创建报告目录结构
  - 创建 `docs/reviews/playground/` 目录
  - 创建汇总报告模板 `summary.md`
  - _Requirements: 2.1, 3.1_

- [ ] 2. 审查 controllers 模块
  - [ ] 2.1 审查 `playground/controllers/` 目录
    - 分析 drawer-state.ts 和 index.ts
    - 检查状态管理逻辑的正确性
    - 检查响应式 API 使用是否规范
    - _Requirements: 4.2, 4.3, 6.1_
  - [ ] 2.2 生成 controllers.md 报告
    - 记录发现的问题（最多 5 条）
    - 更新审查状态为已完成
    - _Requirements: 2.1, 2.3, 2.4, 4.6_

- [ ] 3. 审查 components 模块
  - [ ] 3.1 审查 `playground/components/` 目录
    - 分析 counter.tsx
    - 检查组件结构和 JSX 语法
    - 检查响应式 API 使用
    - _Requirements: 4.2, 4.3, 6.1, 6.2_
  - [ ] 3.2 生成 components.md 报告
    - 记录发现的问题（最多 5 条）
    - 更新审查状态为已完成
    - _Requirements: 2.1, 2.3, 2.4, 4.6_

- [ ] 4. 审查 router 模块
  - [ ] 4.1 审查 `playground/router/` 目录
    - 分析路由配置
    - 检查路由定义是否完整
    - _Requirements: 4.2, 4.3, 6.4_
  - [ ] 4.2 生成 router.md 报告
    - 记录发现的问题（最多 5 条）
    - 更新审查状态为已完成
    - _Requirements: 2.1, 2.3, 2.4, 4.6_

- [ ] 5. 审查 views/basic 模块
  - [ ] 5.1 审查 `playground/views/basic/` 目录
    - 分析所有基础示例视图
    - 检查组件结构和 JSX 语法
    - 检查响应式 API 使用
    - _Requirements: 4.2, 4.3, 6.1, 6.2_
  - [ ] 5.2 生成 views-basic.md 报告
    - 记录发现的问题（最多 5 条）
    - 更新审查状态为已完成
    - _Requirements: 2.1, 2.3, 2.4, 4.6_

- [ ] 6. 审查 views/lis-visualization 模块
  - [ ] 6.1 审查 `playground/views/lis-visualization/` 目录
    - 分析组件、控制器、处理器、工具函数
    - 检查模块间职责分离
    - 检查响应式 API 使用
    - _Requirements: 4.2, 4.3, 6.1, 6.3_
  - [ ] 6.2 生成 views-lis-visualization.md 报告
    - 记录发现的问题（最多 5 条）
    - 更新审查状态为已完成
    - _Requirements: 2.1, 2.3, 2.4, 4.6_

- [ ] 7. 审查 tests 模块
  - [ ] 7.1 审查 `playground/__tests__/` 目录
    - 分析测试文件结构
    - 检查测试覆盖范围
    - _Requirements: 4.2, 4.3, 6.5_
  - [ ] 7.2 生成 tests.md 报告
    - 记录发现的问题（最多 5 条）
    - 更新审查状态为已完成
    - _Requirements: 2.1, 2.3, 2.4, 4.6_

- [ ] 8. 审查顶级文件
  - [ ] 8.1 审查顶级文件组
    - 分析 app.tsx、main.ts
    - 分析 views/counter-demo.tsx、views/home.tsx、views/not-found.tsx
    - 检查应用入口和根组件结构
    - _Requirements: 1.2, 4.2, 4.3_
  - [ ] 8.2 生成 top-level-files.md 报告
    - 记录发现的问题（最多 5 条）
    - 更新审查状态为已完成
    - _Requirements: 2.2, 2.3, 2.4, 4.6_

- [ ] 9. 生成汇总报告
  - [ ] 9.1 汇总所有审查结果
    - 统计各单元问题数量
    - 按严重程度排序
    - _Requirements: 3.2, 3.3_
  - [ ] 9.2 更新 summary.md
    - 填充统计数据
    - 添加各单元报告链接
    - _Requirements: 3.1, 3.2_

- [ ] 10. Checkpoint - 审查完成验证
  - 确认所有报告已生成
  - 确认汇总报告数据准确
  - 询问用户是否有问题

## Notes

- 每个审查单元最多输出 5 条问题
- 问题格式：`- [严重度] 文件:问题描述`
- 严重度仅使用 Critical、Major、Minor
- 审查重点：正确性、可维护性、潜在缺陷
- 忽略代码风格或偏好差异
