# Router 模块问题记录

## 1. `RouterLink` 截断 query/hash，导致新标签跳转路径不完整（待修复）

- 位置：`src/router/components/router-link.tsx`
- 现状：渲染的 `<a>` 标签 `href` 使用 `normalizePath(to)`，会去掉 query/hash。普通点击被组件拦截后调用 `navigate(props.to)`，但 `target="_blank"` 或 Ctrl/Meta 点击不会拦截，浏览器直接使用被截断的 `href` 打开新标签。
- 影响：包含查询参数或锚点的链接在新标签/非拦截场景下跳转地址缺失，行为与显式导航不一致。
- 可能方案：
  - 构造 `href` 时保留附加片段，例如 `const href = normalizePath(to) + getQueryAndHash(to)`（可将 `getQueryAndHash` 导出供组件复用）。
  - 或使用 `new URL(to, location.href)` 解析，再手动规整 pathname，确保 query/hash 原样保留；最终 `href` 与 `navigate` 使用的实际路径保持一致。
  - 补充单测覆盖 `_blank`、Ctrl/Meta 点击等不拦截路径，验证包含 query/hash 的跳转结果。

## 2. 测试通过 Mock 内部模块模拟 `inject`（待优化）

- 位置：`test/router/core/error-cause.test.tsx`
- 现状：使用 `vi.mock('@/runtime-core/index.ts', ...)` 来 mock `inject` 函数。
- 影响：导致测试依赖于 `runtime-core` 的模块结构，增加了跨模块的隐式耦合。
- 提示：建议考虑通过依赖注入（DI）或在测试配置层模拟注入失败，而非直接 Mock 底层模块导出。
