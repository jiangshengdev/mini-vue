# API 文档问题记录

## 1. `@internal` 标记与公开导出冲突【未解决】

- 位置：`src/shared/error-handling.ts`、`src/shared/runtime-error-channel.ts`、`src/runtime-dom/patch-props.ts`，以及聚合导出的 `src/index.ts`
- 现状：`RuntimeErrorHandler`、`RuntimeErrorContext`、`setRuntimeErrorHandler` 与 `ElementRef` 在实现文件中标记为 `@internal`，但 `src/index.ts` 又将它们对外 re-export。API Extractor 会把这些条目视作私有成员而从报告里剔除，导致用户在消费类型定义时无法找到对应声明。
- 风险：发布包的 d.ts 中缺失上述 API，使用者无法类型安全地接入统一错误处理或 DOM `ref`。
- 建议：与导出语义保持一致——要么把 `@internal` 改为 `@public`，要么停止对外 re-export 并在文档中标注为私有能力。

## 2. `@throws {@link unknown}` 链接无法解析【未解决】

- 位置：`src/reactivity/effect-scope.ts` 与 `src/reactivity/effect.ts`
- 现状：`run()`、`effect()` 的 TSDoc 使用 `@throws {@link unknown}` 来描述抛出值，但 `unknown` 不是具体符号，API Extractor 在生成报告时会报链接解析失败。
- 风险：tsdoc 解析中断，API 签名文件可能无法更新，CI 也会受到警告阻塞。
- 建议：改成纯文本 `@throws unknown`，或者指向真实的错误类型；若需要强调错误来源，可在描述中阐明“原样抛出用户副作用中的异常”。

## 3. `SetupFunctionComponent` 标记与使用场景不符【未解决】

- 位置：`src/jsx/virtual-node/types.ts`
- 现状：`SetupFunctionComponent` 被标注 `@beta`，但它作为 `createApp` 与 JSX 入口的主要组件类型已经对外公开，也在文档中作为稳定 API 介绍。
- 风险：API Extractor 会把该类型划入 beta 区域，提醒使用者“实验性质”，与实际使用场景不符；发布站点也可能将其折叠到 beta 小节，降低可发现性。
- 建议：将标记改为 `@public` 或直接移除 beta 标签；若确实需要 beta 语义，应同步在 README/docs 中加以说明并避免默认导出。

## 4. 根入口类型导出仍不完整【未解决】

- 位置：`src/index.ts`、`src/shared/error-handling.ts`、`src/shared/runtime-error-channel.ts`、`src/reactivity/watch/core.ts`、`src/runtime-dom/create-app.ts`、`src/jsx/index.ts`
- 现状：`WatchSource`、`WatchCallback`、`WatchOptions`、`WatchStopHandle` 已新增 re-export，但仍缺少以下对外 API 配套类型：`RuntimeErrorDispatchPayload`、`RuntimeErrorToken`、`WatchCleanup`（在 `watch` 文档中单独引用）、`DomAppInstance` 的 JSX 互操作别名（例如 `ElementProps`、`ElementType`、`ComponentChildren`）。此外 `RuntimeErrorHandler` 的 `dispatchPayload` 参数没有同名导出，导致使用者无法显式标注处理器的完整签名。
- 风险：API 文档虽能展示入口函数，但使用者在类型层面仍需引用内部路径或重写自定义接口；API Extractor 生成的报告也会缺少这些类型条目，导致 d.ts 与文档对不齐。
- 建议：
	- 在 `src/index.ts` 中继续补齐 `RuntimeErrorDispatchPayload`、`RuntimeErrorToken`、`WatchCleanup`、`DomAppInstance`（若已导出需同步说明）以及 JSX 的 `ElementProps`、`ElementType`、`ComponentChildren`；保证公开函数/组件的参数与返回值可直接从入口引用。
	- 对仅供内部调度的类型（`RuntimeErrorHandlerPhase`、`RuntimeErrorPropagationStrategy` 等）暂不导出，待开放 `runWithErrorChannel` 后再集中评估。
	- 根据 re-export 结果同步调整实现文件的 TSDoc（改为 `@public`），避免 `@internal` 与导出语义冲突。
