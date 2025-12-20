# router 审核报告

## 基本信息

- **模块路径**: `test/router/`
- **审核时间**: 2025-12-20
- **文件数量**: 3

## 审核文件列表

- `navigate.test.tsx`
- `normalize-path.test.tsx`
- `core/error-cause.test.tsx`

## 发现的问题

- [Minor] `test/router/core/error-cause.test.tsx`: 使用 `vi.mock('@/runtime-core/index.ts', ...)` 来 mock `inject` 函数。这导致测试依赖于 `runtime-core` 的模块结构，增加了耦合度。建议考虑通过 DI 或更上层的配置来模拟注入失败。

## 统计摘要

| 严重程度 | 数量  |
| -------- | ----- |
| Critical | 0     |
| Major    | 0     |
| Minor    | 1     |
| **总计** | **1** |
