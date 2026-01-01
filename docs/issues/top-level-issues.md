# Top-level 问题记录

## 1. `cleanupTestContainers` 清理策略过于激进（状态：已解决）

- 位置：`test/helpers.ts`
- 现状（修复前）：`cleanupTestContainers` 使用 `document.body.innerHTML = ''` 进行清理。
- 影响：这是一种非常激进的清理策略，虽然能确保环境清洁，但可能会意外清除那些并非由 `createTestContainer` 创建但本应在测试间持久化的 DOM 元素（如果有的话），或者干扰 Vitest 的环境。
- 提示：建议仅清理 `mountedContainers` 集合中的元素，避免操作整个 body。

- 解决：`cleanupTestContainers` 现在只会移除 `mountedContainers` 内登记过的元素，不再对 `document.body` 做全量清空。

## 2. 顶层导出复用错误的组件类型定义（状态：已解决）

- 位置：`src/index.ts`
- 现状（修复前）：入口对外转导的 `ElementType`/`SetupComponent` 来自 `jsx-foundation`，旧实现曾因组件上界使用 `(props: never)` 导致 TSX props 推导坍缩。
- 解决：已在 `jsx-foundation` 修正组件类型上界与 `ElementProps` 推导链，入口继续转导即可正常工作。
- 回归：`test/jsx-foundation/element-type.types.test.tsx`

## 3. JSX shim 对内置标签属性约束过于宽松（状态：已解决；备注：仍可细化）

- 位置：`src/jsx-shim.d.ts`
- 现状：`IntrinsicElements` 已切换为基于 DOM lib 的标签映射，事件也按 `HTMLElementEventMap` 提供了具体签名，并保留字符串索引兼容自定义属性；为简化 Hover，已将 HTML 与 SVG 标签拆分，SVG 侧排除了与 HTML 重名的标签。
- 影响：VSCode/TSX 能补全原生属性和事件，Hover 复杂度降低；但被排除的 SVG 重名标签（如 `a`、`title` 等）现在使用 HTML 版本的属性定义，SVG 侧的严格性缺失。
- 后续改进：可为重名标签补充 SVG 专用别名或 JSDoc 说明，或提供可配置的 SVG 严格模式以恢复精确属性提示。
