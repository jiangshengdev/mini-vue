# Router 模块问题记录

## 1. `RouterLink` 截断 query/hash，导致新标签跳转路径不完整（已修复）

- 位置：`src/router/components/router-link.tsx`
- 现状：`RouterLink` 渲染 `href` 时用 `normalizePath(to)`，会去掉 query/hash；`target="_blank"`/修饰键点击不会被拦截，浏览器直接使用截断后的 `href`。
- 解决：`RouterLink` 通过 `normalizePath(to) + getQueryAndHash(to)` 生成完整 `href`，在不拦截场景下仍能保留 query/hash；补充 `_blank` 场景断言 `href` 包含 query/hash 且默认导航仍由浏览器处理。

## 2. 测试通过 Mock 内部模块模拟 `inject`（待优化）

- 位置：`test/router/core/error-cause.test.tsx`
- 现状：使用 `vi.mock('@/runtime-core/index.ts', ...)` 来 mock `inject` 函数。
- 影响：导致测试依赖于 `runtime-core` 的模块结构，增加了跨模块的隐式耦合。
- 提示：建议考虑通过依赖注入（DI）或在测试配置层模拟注入失败，而非直接 Mock 底层模块导出。

## 3. 未命中路由时 `RouterView` 未渲染 fallback 组件（按设计，无需修复）

- 位置：`src/router/components/router-view.tsx`
- 现状：`matchRoute` 命中 fallback 时已将 `matched` 设为 `[fallback]`，最外层 `RouterView` 会渲染兜底；仅当有嵌套 RouterView 且深度超出 `matched` 长度时才返回 `undefined`。
- 结论：根部兜底已生效，嵌套层空白是预期行为（未配置多级路由/fallback 时不渲染子级）。
- 备注：如需多级兜底，可显式配置嵌套路由并为每层提供 fallback。

## 4. 路由状态丢失 query/hash，currentRoute 与地址栏不一致（已修复）

- 位置：`src/router/core/create-router.ts`
- 现状：`RouteLocation` 现已携带 `fullPath`/`query`/`hash`，`matchRoute`/`navigate`/初始化会读取完整 `pathname + search + hash`，匹配仍按规范化路径进行。
- 影响：`currentRoute` 与地址栏保持一致，组件可读取 query/hash，且不影响路径匹配。

## 5. 全局 WeakSet 误判多实例重复安装（待修复）

- 位置：`src/router/core/create-router.ts`
- 现状：`appsWithRouter` 是模块级 WeakSet，多个 router 实例会共享，导致不同实例在同一 app 场景被误判为重复安装并抛错。
- 影响：单页多 router 或微前端场景无法正常安装。
- 可能方案：
  - 将重复安装检查限定在 router 实例内部（仅对同一实例的重复安装报错），或在全局表中区分 router 实例标识。
  - 为多实例场景提供显式约束/错误信息，避免误判。
