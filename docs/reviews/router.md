# router 代码审查报告

## 审查状态

- **状态**: 已完成
- **审查日期**: 2025-12-21

## 审查范围

- `src/router/components/index.ts`
- `src/router/components/router-link.tsx`
- `src/router/components/router-view.tsx`
- `src/router/core/create-router.ts`
- `src/router/core/index.ts`
- `src/router/core/injection.ts`
- `src/router/core/paths.ts`
- `src/router/core/types.ts`
- `src/router/index.ts`

## 发现的问题

### Critical

- 无

### Major

- [Major] src/router/components/router-view.tsx: `getMatched` 默认返回 `currentRoute.value.matched`（初始为 `[component]`），没有附带兜底组件；当路径未命中任何 record 时 `matchRoute` 返回的 `fallback` 被放在 `component`，但未写入 `matched`，导致未命中时 RouterView 渲染 `undefined` 而不是 `fallback`，路由兜底失效。
- [Major] src/router/core/create-router.ts: `normalizePath` 丢弃 query/hash 后再与路由表匹配，`navigate`/`currentRoute` 都只存储纯路径，调用 `navigate('/foo?x=1#y')` 时 history 写入了完整 URL，但 `currentRoute.path`/`matched` 仍是 `/foo`，导致路由状态与地址栏不一致且组件层无法读取 query/hash。

### Minor

- [Minor] src/router/core/create-router.ts: `appsWithRouter` 用于全局去重，`install` 重复调用时直接抛错；但不同 router 实例共享同一 WeakSet，导致在单页挂多个 router（例如独立挂载多个微前端）时会误报重复安装并中断安装流程，缺少多实例容错策略。

## 统计

- Critical: 0
- Major: 2
- Minor: 1
- 总计: 3
