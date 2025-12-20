# router 代码审查报告

## 审查状态

- **状态**: 已完成
- **审查日期**: 2025-12-20

## 审查范围

- src/router/components/index.ts
- src/router/components/router-link.tsx
- src/router/components/router-view.tsx
- src/router/core/create-router.ts
- src/router/core/index.ts
- src/router/core/injection.ts
- src/router/core/paths.ts
- src/router/core/types.ts
- src/router/index.ts

## 发现的问题

### Critical

- 暂无

### Major

- [Major] src/router/components/router-link.tsx: 渲染的 `href` 通过 `normalizePath` 去掉了 query/hash，仅保留纯路径。对于 `target=\"_blank\"` 或 Ctrl/Meta 点击（不拦截默认行为）会直接使用该 `href` 打开新标签，导致带查询或锚点的链接被错误截断，跳转地址与 `navigate` 行为不一致。

### Minor

- 暂无

## 统计

- Critical: 0
- Major: 1
- Minor: 0
- 总计: 1
