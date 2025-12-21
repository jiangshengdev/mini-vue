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

## 3. 未命中路由时 `RouterView` 未渲染 fallback 组件（待修复）

- 位置：`src/router/components/router-view.tsx`
- 现状：`getMatched` 默认返回 `currentRoute.value.matched`；`matchRoute` 未把 `fallback` 写入 `matched`，未命中时 `matched` 为空，RouterView 渲染 `undefined`。
- 影响：路由兜底组件不会显示，未命中路径时页面空白。
- 可能方案：
  - 在 `matchRoute` 命中 fallback 时将 `matched` 填为 `[fallback]`，确保 RouterView 能渲染兜底。
  - 补充未命中路径的组件渲染用例，覆盖多层 RouterView。

## 4. 路由状态丢失 query/hash，currentRoute 与地址栏不一致（待修复）

- 位置：`src/router/core/create-router.ts`
- 现状：`normalizePath` 匹配时丢弃 query/hash，`navigate` 写入 history 时包含 query/hash，但 `currentRoute.path`/`matched` 仍是纯路径。
- 影响：组件层无法读取 query/hash，状态与地址栏不一致，易导致功能异常。
- 可能方案：
  - 在 `RouteLocation` 中显式携带 `fullPath`/`query`/`hash`，`matchRoute` 保留这些信息。
  - `navigate` 与初始化时同步写入完整路径信息，并提供解析后的结构。

## 5. 全局 WeakSet 误判多实例重复安装（待修复）

- 位置：`src/router/core/create-router.ts`
- 现状：`appsWithRouter` 是模块级 WeakSet，多个 router 实例会共享，导致不同实例在同一 app 场景被误判为重复安装并抛错。
- 影响：单页多 router 或微前端场景无法正常安装。
- 可能方案：
  - 将重复安装检查限定在 router 实例内部（仅对同一实例的重复安装报错），或在全局表中区分 router 实例标识。
  - 为多实例场景提供显式约束/错误信息，避免误判。
