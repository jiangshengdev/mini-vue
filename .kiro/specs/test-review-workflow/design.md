# Design Document: Test Review Workflow

## Overview

本设计定义了一个测试代码审核流程，用于系统性地审查 `test` 目录下的所有测试代码。该流程将按模块生成独立的审核报告，并最终汇总为一份总体报告。

审核流程基于 `.github/prompts/inspect.prompt.md` 中定义的审核规则，关注代码的正确性、可维护性和潜在缺陷，忽略风格差异。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Review Workflow                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Module    │    │   Report    │    │   Summary   │     │
│  │  Scanner    │───▶│  Generator  │───▶│  Generator  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Import    │    │  Module     │    │  Summary    │     │
│  │  Analyzer   │    │  Reports    │    │  Report     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 流程步骤

1. **Module Scanner**: 扫描 `test` 目录，识别所有待审核的模块
2. **Import Analyzer**: 分析每个文件的 import 依赖
3. **Report Generator**: 对每个模块执行审核并生成报告
4. **Summary Generator**: 汇总所有模块报告生成总体报告

## Components and Interfaces

### 1. 审核模块列表

按以下顺序执行审核：

| 序号 | 模块类型 | 模块路径 | 输出文件名 |
|------|----------|----------|------------|
| 1 | 文件夹 | `test/jsx-runtime/` | `jsx-runtime.md` |
| 2 | 文件夹 | `test/reactivity/` | `reactivity.md` |
| 3 | 文件夹 | `test/router/` | `router.md` |
| 4 | 文件夹 | `test/runtime-core/` | `runtime-core.md` |
| 5 | 文件夹 | `test/runtime-dom/` | `runtime-dom.md` |
| 6 | 文件夹 | `test/shared/` | `shared.md` |
| 7 | 顶级文件 | `test/helpers.ts`, `test/index.ts`, `test/setup.ts` | `top-level.md` |

**注意**: 顶级文件（helpers.ts、index.ts、setup.ts）合并为一个模块进行审核，输出到单个报告文件。

### 2. 审核规则接口

```typescript
interface ReviewRule {
  // 分析维度
  dimensions: ['correctness', 'maintainability', 'defects'];
  
  // 排除项
  excludes: ['style', 'preference'];
  
  // 严重程度
  severityLevels: ['Critical', 'Major', 'Minor'];
  
  // 每文件最大问题数
  maxIssuesPerFile: 5;
}
```

### 3. 问题格式接口

```typescript
interface Issue {
  severity: 'Critical' | 'Major' | 'Minor';
  file: string;
  description: string;
}

// 输出格式: `- [${severity}] ${file}:${description}`
```

## Data Models

### Module Report 结构

```markdown
# ${moduleName} 审核报告

## 基本信息

- **模块路径**: ${modulePath}
- **审核时间**: ${timestamp}
- **文件数量**: ${fileCount}

## 审核文件列表

${fileList}

## 发现的问题

${issueList}

## 统计摘要

| 严重程度 | 数量 |
|----------|------|
| Critical | ${criticalCount} |
| Major | ${majorCount} |
| Minor | ${minorCount} |
| **总计** | **${totalCount}** |
```

### Summary Report 结构

```markdown
# 测试代码审核汇总报告

## 审核概览

- **审核时间**: ${timestamp}
- **模块总数**: ${moduleCount}
- **问题总数**: ${totalIssues}

## 问题统计

| 严重程度 | 数量 | 占比 |
|----------|------|------|
| Critical | ${criticalCount} | ${criticalPercent}% |
| Major | ${majorCount} | ${majorPercent}% |
| Minor | ${minorCount} | ${minorPercent}% |

## 各模块统计

| 模块 | Critical | Major | Minor | 总计 | 报告链接 |
|------|----------|-------|-------|------|----------|
${moduleStatsTable}

## Critical 问题快速索引

${criticalIssuesIndex}

## 模块报告链接

${moduleReportLinks}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

基于 prework 分析，以下是经过合并和精简后的可测试属性：

### Property 1: 模块报告生成完整性

*For any* 审核执行，所有指定的 Test_Module 都应该在 `docs/reviews/` 目录下生成对应的 Module_Report 文件。

**Validates: Requirements 2.1**

### Property 2: 报告格式规范性

*For any* 生成的 Module_Report，其内容应满足以下条件：
- 文件为有效的 markdown 格式
- 文件名与模块名对应（kebab-case）
- 包含必需的章节：基本信息、审核文件列表、发现的问题、统计摘要
- 问题列表使用格式 `- [Severity] 文件:描述`
- Severity 仅为 Critical、Major、Minor 之一

**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

### Property 3: 问题输出规范性

*For any* 生成的报告中的问题列表：
- 每个文件的问题数量不超过 5 条
- 问题仅陈述问题本身，不包含修复建议
- 问题按严重程度从高到低排序

**Validates: Requirements 4.3, 4.4**

### Property 4: 汇总报告完整性

*For any* 完成的审核流程，Summary_Report 应满足以下条件：
- 保存在 `docs/reviews/summary.md`
- 包含所有模块的统计数据
- 包含指向各 Module_Report 的有效链接
- 包含 Critical 问题的快速索引

**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

| 错误场景 | 处理方式 |
|----------|----------|
| 模块路径不存在 | 记录警告，跳过该模块，继续下一个 |
| 文件读取失败 | 记录错误到报告，标记为无法审核 |
| 报告写入失败 | 抛出错误，终止当前模块审核 |
| import 分析失败 | 记录警告，仅审核当前文件 |

## Testing Strategy

### 单元测试

由于本功能主要是一个审核流程定义，不涉及可执行代码，因此不需要传统的单元测试。

### 验收测试

通过执行审核任务并检查输出来验证：

1. **报告生成验证**: 检查 `docs/reviews/` 目录下是否生成了所有预期的报告文件
2. **格式验证**: 检查每个报告是否符合预定义的 markdown 结构
3. **内容验证**: 检查报告内容是否包含所有必需的章节
4. **链接验证**: 检查汇总报告中的链接是否有效

### 手动验证清单

- [ ] 所有 7 个模块报告已生成
- [ ] 汇总报告 `summary.md` 已生成
- [ ] 报告格式符合规范
- [ ] 问题严重程度标注正确
- [ ] 汇总报告链接可正常跳转
