# jsx-runtime 代码审查报告

## 审查状态

- **状态**: 已完成
- **审查日期**: 2025-12-21

## 审查范围

- `src/jsx-runtime/builder.ts`
- `src/jsx-runtime/index.ts`
- `src/jsx-runtime/runtime.ts`

## 发现的问题

### Critical

- 无

### Major

- [Major] src/jsx-runtime/builder.ts: `h`/`jsx` 依赖的 `ElementType` 与 `ElementProps` 均来自 `jsx-foundation`，其中组件类型被限定为 `(props: never) => RenderFunction`，导致运行时 API 无法接受正常的函数组件/`SetupComponent`（TSX 使用组件会直接类型报错），核心入口在类型层面不可用。

### Minor

- 无

## 统计

- Critical: 0
- Major: 1
- Minor: 0
- 总计: 1
