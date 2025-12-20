# Requirements Document

## Introduction

本功能定义一个测试代码审核流程，在执行任务时对 `test` 文件夹进行系统性代码审查。审核将按照 `test` 目录结构分模块进行，每个子文件夹及顶级文件生成独立的审核报告，最终汇总为一份总体报告。

## Glossary

- **Review_Workflow**: 测试代码审核流程，定义审核的触发时机、执行步骤和输出格式
- **Module_Report**: 针对单个测试模块（子文件夹或顶级文件）生成的独立审核报告
- **Summary_Report**: 汇总所有模块审核结果的总体报告
- **Severity_Level**: 问题严重程度，分为 Critical、Major、Minor 三级
- **Test_Module**: `test` 目录下的一个子文件夹或顶级测试文件

## Requirements

### Requirement 1: 审核范围定义

**User Story:** As a 开发者, I want to 明确审核的文件范围, so that 审核流程能够系统性地覆盖所有测试代码。

#### Acceptance Criteria

1. THE Review_Workflow SHALL 审核以下 Test_Module：
   - `test/jsx-runtime/` 文件夹
   - `test/reactivity/` 文件夹（含子文件夹 array、effect、effect-scope、ref、watch）
   - `test/router/` 文件夹（含子文件夹 core）
   - `test/runtime-core/` 文件夹（含子文件夹 app、component、mount、patch、provide-inject、renderer）
   - `test/runtime-dom/` 文件夹（含子文件夹 app、component、context、error、props、ref、render）
   - `test/shared/` 文件夹
   - 顶级文件模块（包含 `test/helpers.ts`、`test/index.ts`、`test/setup.ts`）

2. WHEN 审核某个测试文件 THEN THE Review_Workflow SHALL 先读取该文件显式 import 的其他文件

### Requirement 2: 模块报告生成

**User Story:** As a 开发者, I want to 为每个测试模块生成独立的审核报告, so that 我可以针对性地查看和处理各模块的问题。

#### Acceptance Criteria

1. WHEN 审核完成一个 Test_Module THEN THE Review_Workflow SHALL 在 `docs/reviews/` 目录下生成对应的 Module_Report
2. THE Module_Report SHALL 使用 markdown 格式，文件名与模块名对应（如 `jsx-runtime.md`、`helpers.md`）
3. THE Module_Report SHALL 包含以下内容：
   - 模块名称和审核时间
   - 审核的文件列表
   - 发现的问题列表（按严重程度排序）
   - 问题统计摘要
4. WHEN 列出问题 THEN THE Module_Report SHALL 使用格式 `- [Severity_Level] 文件:问题描述`
5. THE Module_Report SHALL 仅包含 Critical、Major、Minor 三种 Severity_Level

### Requirement 3: 汇总报告生成

**User Story:** As a 开发者, I want to 获得一份汇总所有模块审核结果的总体报告, so that 我可以快速了解整体测试代码质量。

#### Acceptance Criteria

1. WHEN 所有 Test_Module 审核完成 THEN THE Review_Workflow SHALL 生成 Summary_Report
2. THE Summary_Report SHALL 保存为 `docs/reviews/summary.md`
3. THE Summary_Report SHALL 包含以下内容：
   - 审核概览（总模块数、总问题数）
   - 各 Severity_Level 的问题数量统计
   - 各模块的问题数量统计表格
   - 指向各 Module_Report 的链接
   - Critical 级别问题的快速索引

### Requirement 4: 审核规则

**User Story:** As a 开发者, I want to 审核遵循统一的规则, so that 审核结果具有一致性和可比性。

#### Acceptance Criteria

1. THE Review_Workflow SHALL 分析以下方面：
   - 实现的正确性
   - 可维护性
   - 潜在缺陷
2. THE Review_Workflow SHALL 忽略代码风格或偏好差异
3. WHEN 发现问题 THEN THE Review_Workflow SHALL 仅陈述问题，不提供修复方案
4. THE Review_Workflow SHALL 每个文件最多列出 5 条问题
5. WHEN 问题不足 5 条 THEN THE Review_Workflow SHALL 按实际数量输出

### Requirement 5: 执行时机

**User Story:** As a 开发者, I want to 在执行任务时触发审核, so that 审核能够与开发流程集成。

#### Acceptance Criteria

1. THE Review_Workflow SHALL 作为独立任务执行，不在当前立即执行
2. WHEN 执行审核任务 THEN THE Review_Workflow SHALL 按模块顺序依次审核
3. IF 审核过程中发生错误 THEN THE Review_Workflow SHALL 记录错误并继续审核下一个模块
