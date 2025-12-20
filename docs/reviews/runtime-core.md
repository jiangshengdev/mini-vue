# runtime-core 审核报告

## 基本信息

- **模块路径**: `test/runtime-core/`
- **审核时间**: 2025-12-20
- **文件数量**: 14

## 审核文件列表

- `app/mount-failure-state.test.tsx`
- `app/use-plugin.test.ts`
- `component/anchor.test.ts`
- `component/mount-handle.test.tsx`
- `mount/child-range-error.test.ts`
- `patch/child.test.tsx`
- `patch/children-keyed.test.tsx`
- `patch/children-unkeyed.test.tsx`
- `patch/insertion.test.ts`
- `patch/patch.types.test.ts`
- `patch/runtime-metadata.test.ts`
- `patch/test-utils.ts`
- `provide-inject/provide-inject.test.ts`
- `renderer/container-key.test.ts`

## 发现的问题

- [Minor] `test/runtime-core/patch/child.test.tsx`: 使用 `vi.mock('@/runtime-core/patch/children.ts', { spy: true })` mock 内部文件。这种对内部目录结构的硬编码依赖降低了重构的灵活性。
- [Minor] `test/runtime-core/patch/insertion.test.ts`: 文件内定义了 `createHostOptionsWithSpies` 辅助函数，其逻辑与 `patch/test-utils.ts` 中的 `createHostRenderer` 高度重复。建议统一复用测试工具库以提高可维护性。
- [Minor] `test/runtime-core/provide-inject/provide-inject.test.ts`: 断言错误 cause 中包含 `{ currentInstance: undefined }`。`currentInstance` 是内部状态，测试其具体值属于白盒测试，若重构内部状态管理可能会导致测试误报。

## 统计摘要

| 严重程度 | 数量  |
| -------- | ----- |
| Critical | 0     |
| Major    | 0     |
| Minor    | 3     |
| **总计** | **3** |
