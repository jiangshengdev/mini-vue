# API 文档问题记录

## 1. `@internal` 标记与公开导出冲突【已解决，统一归入 @beta】

- 位置：`src/shared/error-handling.ts`、`src/shared/runtime-error-channel.ts`、`src/runtime-dom/patch-props.ts`，以及聚合导出的 `src/index.ts`
- 进展：上述导出与其实现文件的 TSDoc 现已同步移除 `@internal`，统一标注为 `@beta`，与入口导出语义保持一致，API Extractor 会正常产出公开条目。
- 说明：仍保留 `@beta` 以提醒调用方这些能力尚处测试阶段，一旦决定稳定需再将标签调整为 `@public` 并在文档中声明。

## 2. `@throws {@link unknown}` 链接无法解析【已解决】

- 位置：`src/reactivity/effect-scope.ts` 与 `src/reactivity/effect.ts`
- 进展：`run()`、`effect()` 的 TSDoc 现已改写为纯文本 `@throws` 描述，直接说明“原样抛出用户副作用的异常”，不再引用不存在的符号。
- 结果：API Extractor 不会再报 `tsdoc-reference-missing-dot`，生成的 d.ts/报告可顺利更新。

## 3. `SetupFunctionComponent` 标记与使用场景不符【暂缓处理】

- 位置：`src/jsx/virtual-node/types.ts`
- 现状：`SetupFunctionComponent` 仍保持 `@beta`，虽然它作为 `createApp` 与 JSX 入口的主要组件类型已经对外公开，也在文档中作为稳定 API 介绍。
- 决议：短期内按照“先暴露为 `@beta`，后续视反馈升级”为策略，不调整类型标记；待后续版本确认语义稳定后再评估改为 `@public`。
- 待办：文档中需注明该类型当前归类为 beta，以免与 API 站点的分组信息冲突，未来如果升级请同步更新此记录。

## 4. 根入口类型导出仍不完整【未解决】

- 位置：`src/index.ts`、`src/shared/error-handling.ts`、`src/shared/runtime-error-channel.ts`、`src/reactivity/watch/core.ts`、`src/runtime-dom/create-app.ts`、`src/jsx/index.ts`
- 现状：`WatchSource`、`WatchCallback`、`WatchOptions`、`WatchStopHandle` 已新增 re-export，同时 `DomAppInstance` 也已在入口导出；但仍缺少 `RuntimeErrorDispatchPayload`、`RuntimeErrorToken` 以及 JSX 互操作别名（例如 `ElementProps`、`ElementType`、`ComponentChildren`）。此外 `RuntimeErrorHandler` 的 `dispatchPayload` 参数没有同名导出，导致使用者无法显式标注处理器的完整签名。
- 说明：`WatchCleanup` 在 Vue 官方实现中亦保持内部使用，当前沿用同样策略，不再计划对外导出。
- 风险：API 文档虽能展示入口函数，但使用者在类型层面仍需引用内部路径或重写自定义接口；API Extractor 生成的报告也会缺少这些类型条目，导致 d.ts 与文档对不齐。
- 建议：
  - 在 `src/index.ts` 中继续补齐 `RuntimeErrorDispatchPayload`、`RuntimeErrorToken` 以及 JSX 的 `ElementProps`、`ElementType`、`ComponentChildren` 等 re-export，保证公开函数/组件的参数与返回值可直接从入口引用。
  - 对仅供内部调度的类型（`RuntimeErrorHandlerPhase`、`RuntimeErrorPropagationStrategy` 等）暂不导出，待开放 `runWithErrorChannel` 后再集中评估。
  - 根据 re-export 结果同步调整实现文件的 TSDoc（改为 `@public`），避免 `@internal` 与导出语义冲突。
