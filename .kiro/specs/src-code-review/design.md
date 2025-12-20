# Design Document: src-code-review

## Overview

本设计描述了一个模块化的代码审查任务系统，用于对 `src/` 目录进行分组审查。系统将审查工作划分为 9 个独立单元（8 个子文件夹 + 1 个顶级文件组），每个单元生成独立报告，最终汇总为总览文档。

## Architecture

```
src/                          docs/reviews/
├── jsx-foundation/    ──►    ├── jsx-foundation.md
├── jsx-runtime/       ──►    ├── jsx-runtime.md
├── messages/          ──►    ├── messages.md
├── reactivity/        ──►    ├── reactivity.md
├── router/            ──►    ├── router.md
├── runtime-core/      ──►    ├── runtime-core.md
├── runtime-dom/       ──►    ├── runtime-dom.md
├── shared/            ──►    ├── shared.md
├── index.ts           ──►    ├── top-level-files.md
├── jsx-dev-runtime.ts        │
├── jsx-runtime.ts            │
├── jsx-shim.d.ts             │
└── vite-env.d.ts             └── summary.md (汇总)
```

## Components and Interfaces

### 审查报告模板

每个审查报告遵循统一结构：

```markdown
# {审查单元名称} 代码审查报告

## 审查状态

- **状态**: 待审查 | 已完成
- **审查日期**: YYYY-MM-DD

## 审查范围

- `file1.ts`
- `file2.ts`
- ...

## 发现的问题

### Critical

- [Critical] file.ts: 问题描述

### Major

- [Major] file.ts: 问题描述

### Minor

- [Minor] file.ts: 问题描述

## 统计

- Critical: N
- Major: N
- Minor: N
- 总计: N
```

### 汇总报告模板

```markdown
# src/ 代码审查汇总报告

## 审查进度

| 审查单元       | 状态   | Critical | Major | Minor | 总计 |
| -------------- | ------ | -------- | ----- | ----- | ---- |
| jsx-foundation | 待审查 | -        | -     | -     | -    |
| ...            | ...    | ...      | ...   | ...   | ...  |

## 问题总览

- **Critical**: N
- **Major**: N
- **Minor**: N
- **总计**: N

## 各单元报告链接

- [jsx-foundation](./jsx-foundation.md)
- ...
```

## Data Models

### ReviewUnit（审查单元）

| 字段       | 类型                     | 说明           |
| ---------- | ------------------------ | -------------- |
| name       | string                   | 审查单元名称   |
| type       | 'folder' \| 'top-level'  | 单元类型       |
| files      | string[]                 | 包含的文件列表 |
| status     | 'pending' \| 'completed' | 审查状态       |
| reportPath | string                   | 报告文件路径   |

### Issue（问题）

| 字段        | 类型                             | 说明         |
| ----------- | -------------------------------- | ------------ |
| severity    | 'Critical' \| 'Major' \| 'Minor' | 严重程度     |
| file        | string                           | 问题所在文件 |
| description | string                           | 问题描述     |

### 审查单元定义

```typescript
const REVIEW_UNITS: ReviewUnit[] = [
  {
    name: 'jsx-foundation',
    type: 'folder',
    files: [],
    status: 'pending',
    reportPath: 'docs/reviews/jsx-foundation.md',
  },
  {
    name: 'jsx-runtime',
    type: 'folder',
    files: [],
    status: 'pending',
    reportPath: 'docs/reviews/jsx-runtime.md',
  },
  {
    name: 'messages',
    type: 'folder',
    files: [],
    status: 'pending',
    reportPath: 'docs/reviews/messages.md',
  },
  {
    name: 'reactivity',
    type: 'folder',
    files: [],
    status: 'pending',
    reportPath: 'docs/reviews/reactivity.md',
  },
  {
    name: 'router',
    type: 'folder',
    files: [],
    status: 'pending',
    reportPath: 'docs/reviews/router.md',
  },
  {
    name: 'runtime-core',
    type: 'folder',
    files: [],
    status: 'pending',
    reportPath: 'docs/reviews/runtime-core.md',
  },
  {
    name: 'runtime-dom',
    type: 'folder',
    files: [],
    status: 'pending',
    reportPath: 'docs/reviews/runtime-dom.md',
  },
  {
    name: 'shared',
    type: 'folder',
    files: [],
    status: 'pending',
    reportPath: 'docs/reviews/shared.md',
  },
  {
    name: 'top-level-files',
    type: 'top-level',
    files: ['index.ts', 'jsx-dev-runtime.ts', 'jsx-runtime.ts', 'jsx-shim.d.ts', 'vite-env.d.ts'],
    status: 'pending',
    reportPath: 'docs/reviews/top-level-files.md',
  },
]
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

由于本任务是一个文档生成和审查流程，主要涉及人工判断和文件操作，不涉及可自动化测试的业务逻辑。以下为流程正确性的约束：

### Property 1: 审查单元完整性

_For any_ 执行完成的审查流程，所有 9 个审查单元都应有对应的报告文件存在于 `docs/reviews/` 目录。
**Validates: Requirements 1.1, 1.2, 2.1, 2.2**

### Property 2: 报告格式一致性

_For any_ 生成的审查报告，都应包含审查状态、审查范围、问题列表和统计信息四个部分。
**Validates: Requirements 2.3, 2.4, 2.5**

### Property 3: 汇总报告完整性

_For any_ 生成的汇总报告，应包含所有 9 个审查单元的状态和问题统计。
**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

| 场景           | 处理方式                           |
| -------------- | ---------------------------------- |
| 目标文件夹为空 | 报告中标注"无文件需审查"           |
| 文件读取失败   | 在报告中记录错误，继续处理其他文件 |
| 输出目录不存在 | 自动创建 `docs/reviews/` 目录      |

## Testing Strategy

本任务为文档生成流程，测试策略以人工验证为主：

1. **结构验证**: 检查生成的报告是否符合模板结构
2. **完整性验证**: 确认所有审查单元都有对应报告
3. **链接验证**: 确认汇总报告中的链接指向正确的文件
