# reactivity 审核报告

## 基本信息

- **模块路径**: `test/reactivity/`
- **审核时间**: 2025-12-20
- **文件数量**: 19

## 审核文件列表

- `reactive.test.ts`
- `array/batch-dedup.test.ts`
- `array/mutators.test.ts`
- `array/search.test.ts`
- `effect/basic.test.ts`
- `effect/error.test.ts`
- `effect/scheduler.test.ts`
- `effect/stop.test.ts`
- `effect-scope/api.test.ts`
- `effect-scope/lifecycle.test.ts`
- `ref/basic.test.ts`
- `ref/computed.test.ts`
- `ref/interop.test.ts`
- `ref/to-ref.test.ts`
- `watch/basic.test.ts`
- `watch/cleanup-error.test.ts`
- `watch/deep.test.ts`
- `watch/lifecycle.test.ts`

## 发现的问题

- [Minor] `test/reactivity/effect-scope/lifecycle.test.ts`: 测试用例 '子 scope 被移除后 positionInParent 会被重置' 使用 `Reflect.get(scope, positionInParentKey)` 访问私有内部状态 `positionInParent`。依赖内部实现细节会导致测试脆弱，建议仅通过公共行为验证或作为白盒测试明确标记。
- [Minor] `test/reactivity/effect/basic.test.ts`: 使用 `vi.mock('@/reactivity/internals/dependency.ts', { spy: true })` mock 内部模块。这使得测试与内部文件结构耦合，若重构内部目录结构将导致测试失败。

## 统计摘要

| 严重程度 | 数量  |
| -------- | ----- |
| Critical | 0     |
| Major    | 0     |
| Minor    | 2     |
| **总计** | **2** |
