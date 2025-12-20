# jsx-runtime 审核报告

## 基本信息

- **模块路径**: `test/jsx-runtime/`
- **审核时间**: 2025-12-20
- **文件数量**: 3

## 审核文件列表

- `h.test.ts`
- `h.typecheck.ts`
- `jsx.test.tsx`

## 发现的问题

- [Minor] `test/jsx-runtime/jsx.test.tsx`: 测试用例 '忽略对象与函数等不可渲染的 children' 中手动管理 `console.warn` 的 mock 和 restore。建议使用 `vi.mocked` 或 `afterEach` 全局清理，以避免在 `try` 块之外发生错误时污染其他测试。
- [Minor] `test/jsx-runtime/h.test.ts`: 测试用例 '支持省略 props 直接传入可变 children' 显式断言 `expect(virtualNode.key).toBeUndefined()`。虽然目前正确，但过度依赖 `h` 函数处理 `undefined` props 的内部实现细节。

## 统计摘要

| 严重程度 | 数量  |
| -------- | ----- |
| Critical | 0     |
| Major    | 0     |
| Minor    | 2     |
| **总计** | **2** |
