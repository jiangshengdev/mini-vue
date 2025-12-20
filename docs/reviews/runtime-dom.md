# runtime-dom 审核报告

## 基本信息

- **模块路径**: `test/runtime-dom/`
- **审核时间**: 2025-12-20
- **文件数量**: 18

## 审核文件列表

- `app/create-app.test.tsx`
- `app/router-injection.test.tsx`
- `component/component.test.tsx`
- `context/provide-inject.test.tsx`
- `error/basic.test.tsx`
- `error/fragment.test.tsx`
- `error/nested.test.tsx`
- `props/attr.test.tsx`
- `props/class.test.tsx`
- `props/style.test.tsx`
- `ref/ref.test.tsx`
- `render/basic.test.tsx`
- `render/boolean.test.tsx`
- `render/children.test.tsx`
- `render/fragment-child-anchor.test.tsx`
- `render/fragment.test.tsx`
- `render/insert-before.test.ts`
- `render/patch-diff.test.tsx`

## 发现的问题

- [Minor] `test/runtime-dom/component/component.test.tsx`: 直接访问 `instance.cleanupTasks`。这是组件实例的内部属性，属于白盒测试，增加了与内部实现细节的耦合。
- [Minor] `test/runtime-dom/render/basic.test.tsx`: 修改 `Element.prototype.remove` 原型方法进行 spy。虽然在 `finally` 中恢复了，但在并发测试环境下修改全局对象原型存在风险，且可能干扰其他测试。

## 统计摘要

| 严重程度 | 数量  |
| -------- | ----- |
| Critical | 0     |
| Major    | 0     |
| Minor    | 2     |
| **总计** | **2** |
