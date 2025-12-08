# API 文档问题记录

## 1. 根入口类型导出仍不完整【未解决】

- 位置：`src/index.ts`、`src/shared/error-handling.ts`、`src/shared/runtime-error-channel.ts`、`src/reactivity/watch/core.ts`、`src/runtime-dom/create-app.ts`、`src/jsx/index.ts`
- 现状：`WatchSource`、`WatchCallback`、`WatchOptions`、`WatchStopHandle` 已新增 re-export，同时 `DomAppInstance` 也已在入口导出；但仍缺少 `RuntimeErrorDispatchPayload`、`RuntimeErrorToken` 以及 JSX 互操作别名（例如 `ElementProps`、`ElementType`、`ComponentChildren`）。此外 `RuntimeErrorHandler` 的 `dispatchPayload` 参数没有同名导出，导致使用者无法显式标注处理器的完整签名。
- 说明：`WatchCleanup` 在 Vue 官方实现中亦保持内部使用，当前沿用同样策略，不再计划对外导出。
- 风险：API 文档虽能展示入口函数，但使用者在类型层面仍需引用内部路径或重写自定义接口；API Extractor 生成的报告也会缺少这些类型条目，导致 d.ts 与文档对不齐。
- 建议：
  - 在 `src/index.ts` 中继续补齐 `RuntimeErrorDispatchPayload`、`RuntimeErrorToken` 以及 JSX 的 `ElementProps`、`ElementType`、`ComponentChildren` 等 re-export，保证公开函数/组件的参数与返回值可直接从入口引用。
  - 对仅供内部调度的类型（`RuntimeErrorHandlerPhase`、`RuntimeErrorPropagationStrategy` 等）暂不导出，待开放 `runWithErrorChannel` 后再集中评估。
  - 根据 re-export 结果同步调整实现文件的 TSDoc（改为 `@public`），避免 `@internal` 与导出语义冲突。
