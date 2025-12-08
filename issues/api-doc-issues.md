# API 文档问题记录

## 1. 根入口类型导出仍不完整【未解决】

- 位置：`src/index.ts`、`src/shared/error-handling.ts`、`src/shared/error-channel.ts`、`src/reactivity/watch/core.ts`、`src/runtime-dom/create-app.ts`、`src/jsx-foundation/index.ts`
- 现状：`WatchSource`、`WatchCallback`、`WatchOptions`、`WatchStopHandle` 已新增 re-export，同时 `DomAppInstance` 与 JSX 别名（`ElementProps`、`ElementType`、`ComponentChildren`）也在入口导出；但错误通道的类型仍缺少 re-export（`ErrorDispatchPayload`、`ErrorToken` 以及 `ErrorRunOptions`/`ErrorBeforeHook`/`ErrorAfterHook`），导致使用者无法显式标注错误处理器签名。
- 说明：`WatchCleanup` 仍保持内部使用，不再计划对外导出。
- 风险：API 文档虽能展示入口函数，但使用者在类型层面仍需引用内部路径或重写自定义接口；API Extractor 生成的报告也会缺少这些类型条目，导致 d.ts 与文档对不齐。
- 建议：
  - 在 `src/index.ts` 中补齐错误通道相关类型的 re-export，至少覆盖 `ErrorDispatchPayload`、`ErrorToken`、`ErrorRunOptions`，必要时附带 hook 类型，保证 `ErrorHandler` 的参数可从入口直接引用。
  - 仅供内部调度的细粒度类型（如传播策略枚举）暂不导出，待开放 `runWithErrorChannel` 后再集中评估。
  - 根据 re-export 结果同步调整实现文件的 TSDoc（改为 `@public`），避免 `@internal` 与导出语义冲突。
