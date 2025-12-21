# top-level-files 代码审查报告

## 审查状态

- **状态**: 已完成
- **审查日期**: 2025-12-21

## 审查范围

- `src/index.ts`
- `src/jsx-dev-runtime.ts`
- `src/jsx-runtime.ts`
- `src/jsx-shim.d.ts`
- `src/vite-env.d.ts`

## 发现的问题

### Critical

- 无

### Major

- [Major] src/index.ts: 顶层导出聚合仍引用 `jsx-foundation/index.ts` 中的 `ElementType`/`SetupComponent`，其内部组件类型被写死为 `(props: never) => RenderFunction`，导致对外暴露的组件/JSX 类型同样不可用，入口导出层面放大了组件类型不兼容问题。

### Minor

- [Minor] src/jsx-shim.d.ts: `IntrinsicElements` 被定义为 `Record<string, PropsShape>`，未兼容组件 `ElementType` 的 `props` 推导（总是宽松字典），实际 TSX 上无法对原生标签属性做约束，类型提示形同虚设。

## 统计

- Critical: 0
- Major: 1
- Minor: 1
- 总计: 2
