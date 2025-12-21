# Top-level 问题记录

## 1. `cleanupTestContainers` 清理策略过于激进（待优化）

- 位置：`test/helpers.ts`
- 现状：`cleanupTestContainers` 使用 `document.body.innerHTML = ''` 进行清理。
- 影响：这是一种非常激进的清理策略，虽然能确保环境清洁，但可能会意外清除那些并非由 `createTestContainer` 创建但本应在测试间持久化的 DOM 元素（如果有的话），或者干扰 Vitest 的环境。
- 提示：建议仅清理 `mountedContainers` 集合中的元素，避免操作整个 body。

## 2. 顶层导出复用错误的组件类型定义（待修复）

- 位置：`src/index.ts`
- 现状：对外导出的 `ElementType`/`SetupComponent` 直接来自 `jsx-foundation`，其组件类型被限定为 `(props: never)`，导致入口导出的组件/JSX 类型同样不可用。
- 影响：外部消费者通过入口导入组件类型或使用 TSX 时会类型报错，入口层放大了组件类型不兼容问题。
- 可能方案：
  - 待 `jsx-foundation` 修正后同步更新入口导出；或在入口侧重新导出修正后的类型别名，避免引入错误定义。
  - 补充类型测试覆盖入口导出，确保组件/JSX 类型可用。

## 3. JSX shim 对内置标签属性约束过于宽松（待优化）

- 位置：`src/jsx-shim.d.ts`
- 现状：`IntrinsicElements = Record<string, PropsShape>`，未按 `ElementType` 推导原生标签 props，等效于对所有标签开放任意属性。
- 影响：TSX 中原生标签缺乏属性校验，类型提示基本失效。
- 可能方案：
  - 参考 React/Vue 的 JSX 定义，为常用标签提供更精确的属性表，或至少引入「字符串标签 → 任意属性」与「组件类型 → 组件 props」的区分。
  - 与 `ElementProps`/运行时支持保持一致，避免 shim 与实际可用 props 出现分叉。
