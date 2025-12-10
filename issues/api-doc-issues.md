# API 文档问题记录

## 1. 根入口类型导出仍不完整【已解决】

- 位置：`src/index.ts`、`src/shared/error-handling.ts`、`src/shared/error-channel.ts`、`src/reactivity/watch/core.ts`、`src/runtime-dom/create-app.ts`、`src/jsx-foundation/index.ts`
- 现状：入口已补充错误通道类型 `ErrorDispatchPayload`、`ErrorToken`、`ErrorContext`、`ErrorMeta` 以及 `ErrorHandler`，外部可直接声明错误处理签名。`WatchSource`、`WatchCallback`、`WatchOptions`、`WatchStopHandle`、`DomAppInstance`、JSX 别名等导出保持完整。
- 说明：`ErrorRunOptions`、`ErrorBeforeHook`、`ErrorAfterHook` 仍仅供内部使用，`WatchCleanup` 维持非导出策略。
- 后续：如开放 `runWithErrorChannel` 再评估是否追加运行时 Hook 导出，同时根据需要补充 TSDoc 可见性。
