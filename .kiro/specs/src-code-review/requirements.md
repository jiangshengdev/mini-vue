# Requirements Document

## Introduction

本规范定义了一个针对 `src/` 目录的代码审查任务系统。审查工作按子文件夹分组进行，每个子文件夹生成独立的审查报告，顶级文件综合为一个报告，最终汇总所有发现。

## Glossary

- **Review_System**: 代码审查任务管理系统
- **Review_Report**: 单个审查单元的输出文件（Markdown 格式）
- **Summary_Report**: 汇总所有审查结果的最终报告
- **Review_Unit**: 一个审查单元，可以是子文件夹或顶级文件组
- **Severity**: 问题严重程度，分为 Critical、Major、Minor 三级

## Requirements

### Requirement 1: 审查单元划分

**User Story:** As a 开发者, I want 将 src 目录按子文件夹和顶级文件分组, so that 审查工作可以模块化进行。

#### Acceptance Criteria

1. THE Review_System SHALL 识别以下子文件夹作为独立审查单元：
   - `jsx-foundation/`
   - `jsx-runtime/`
   - `messages/`
   - `reactivity/`
   - `router/`
   - `runtime-core/`
   - `runtime-dom/`
   - `shared/`

2. THE Review_System SHALL 将以下顶级文件综合为一个审查单元：
   - `index.ts`
   - `jsx-dev-runtime.ts`
   - `jsx-runtime.ts`
   - `jsx-shim.d.ts`
   - `vite-env.d.ts`

3. THE Review_System SHALL 忽略非代码文件（如 `.DS_Store`、`AGENTS.md`）

### Requirement 2: 审查报告输出

**User Story:** As a 开发者, I want 每个审查单元生成独立的 Markdown 报告, so that 可以分模块查看和追踪问题。

#### Acceptance Criteria

1. WHEN 审查一个子文件夹 THEN THE Review_System SHALL 在 `docs/reviews/` 目录下生成对应的 `{folder-name}.md` 文件

2. WHEN 审查顶级文件组 THEN THE Review_System SHALL 生成 `top-level-files.md` 报告

3. THE Review_Report SHALL 包含以下结构：
   - 审查单元名称
   - 审查范围（文件列表）
   - 发现的问题列表（按严重程度排序）
   - 审查状态（待审查/已完成）

4. WHEN 记录问题 THEN THE Review_Report SHALL 使用格式 `- [严重度] 文件:问题描述`

5. THE Review_Report SHALL 仅使用 `Critical`、`Major`、`Minor` 三种严重度标签

### Requirement 3: 汇总报告

**User Story:** As a 开发者, I want 生成一个汇总报告, so that 可以快速了解整体代码质量状况。

#### Acceptance Criteria

1. WHEN 所有审查单元完成 THEN THE Review_System SHALL 生成 `docs/reviews/summary.md` 汇总报告

2. THE Summary_Report SHALL 包含：
   - 各审查单元的问题统计（Critical/Major/Minor 数量）
   - 按严重程度汇总的总问题数
   - 各审查单元报告的链接

3. THE Summary_Report SHALL 按问题严重程度从高到低排序展示

### Requirement 4: 审查执行控制

**User Story:** As a 开发者, I want 按需执行审查任务, so that 可以分阶段完成审查工作。

#### Acceptance Criteria

1. THE Review_System SHALL 支持单独执行某个审查单元的审查

2. WHEN 执行审查 THEN THE Review_System SHALL 先读取目标文件显式 import 的其他文件

3. THE Review_System SHALL 分析实现的正确性、可维护性与潜在缺陷

4. THE Review_System SHALL 忽略代码风格或偏好差异

5. WHEN 发现问题 THEN THE Review_System SHALL 仅输出问题描述，不提供修复方案

6. THE Review_System SHALL 每个审查单元最多输出 5 条问题

### Requirement 5: 审查状态追踪

**User Story:** As a 开发者, I want 追踪每个审查单元的状态, so that 知道哪些已完成、哪些待处理。

#### Acceptance Criteria

1. THE Review_Report SHALL 标记审查状态为 `待审查` 或 `已完成`

2. WHEN 审查完成 THEN THE Review_System SHALL 更新对应报告的状态为 `已完成`

3. THE Summary_Report SHALL 显示各审查单元的当前状态
