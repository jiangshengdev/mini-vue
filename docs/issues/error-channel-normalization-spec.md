# Error Channel：异常规范化（Normalization）规格说明

## 背景

当前错误通道的核心入口是 `runSilent` / `runThrowing` → `runWithChannel` → `dispatchError` → `handleError`。

在 JavaScript 中允许 `throw` 任意值（包括字符串、数字、对象、函数等），但框架侧对外传播与上报若不做约束，会导致：

- 上层调用方接收到非 `Error`，调试信息不稳定（缺少 stack、message 语义混乱）。
- 嵌套错误通道（多层 `runSilent/runThrowing`）捕获同一异常时，上报与传播语义难以统一。

本 spec 的目标是：**框架内部与对外传播的“异常对象”始终是 `Error`**（尽可能保留原始值作为 `cause`），并同步收紧对外 API，使错误处理器与 token 都以 `Error` 为准。

## 目标

1. **统一包装为正确的错误类型**：当捕获到的异常不是 `Error` 时，将其包装为 `Error`。
2. **token 可处理即包装**：当错误将被塞入 `ErrorToken`（以及 `handleError` 上报）时，若可以规范化为 `Error`，则应使用规范化后的 `Error`。

## 当前实现状态（dev 分支）

以下内容已在代码中落地，并由测试覆盖：

- ✅ 异常规范化：捕获到的 `raw` 会先通过 `normalizeError(raw)` 统一转为 `Error`（非 `Error` 会包装为 `new Error(String(raw), { cause: raw })`），并且：
  - `runThrowing`：上报 `normalized`，并 `throw normalized`
  - `runSilent`：上报 `normalized`，不向上传播
- ✅ 对外 API 收紧：`ErrorHandler` / `ErrorToken.error` / `dispatchError` / `handleError` 均以 `Error` 为准。
- ✅ tick-local 去重：`dispatchError` 仅在同一 tick 内对同一个 `Error` 引用去重；会在 microtask 阶段重置 registry，确保跨 tick 仍会上报。

实现位置：

- `src/shared/error-channel.ts`
- `src/shared/error-handling.ts`

测试覆盖：

- `test/shared/error-channel.test.ts`

## 非目标

- 不引入“原始类型去重（primitive dedupe）”的独立机制。
- 不在本 spec 中改变 `runWithChannel` 对 Promise/thenable 的策略（是否支持异步 runner 属于另一份 spec）。
- 不在本 spec 中引入“跨 tick 的全局去重”（例如永久 WeakSet 去重）。

## 定义

- **原始异常**（raw error）：`catch (raw)` 捕获到的值，类型为 `unknown`。
- **规范化异常**（normalized error）：最终进入 `dispatchError`、`ErrorToken`、以及在 `runThrowing` 中向上抛出的异常对象，类型为 `Error`。

## 规范化规则

新增内部工具函数（或等价逻辑）：

- `normalizeError(raw: unknown): Error`
  - 若 `raw instanceof Error`：返回 `raw`（保持引用不变）
  - 否则：返回 `new Error(String(raw), { cause: raw })`

说明：

- `message` 使用 `String(raw)`，保证可读。
- `cause` 记录原始值，保证不丢信息。

## 行为规范（可验收）

### A) `runThrowing`（同步传播）

当 runner 抛出 `raw` 时：

- 必须先规范化：`normalized = normalizeError(raw)`
- 必须对 `dispatchError` 上报 **normalized**
- 必须向上传播 **normalized**（即 `throw normalized`）

验收结果：

- 调用方捕获到的一定是 `Error`
- 若原始异常非 `Error`，则 `caughtError.cause === raw`

### B) `runSilent`（静默吞掉传播）

当 runner 抛出 `raw` 时：

- 必须先规范化：`normalized = normalizeError(raw)`
- 必须对 `dispatchError` 上报 **normalized**
- 不向上传播（返回 `undefined`）

验收结果：

- `setErrorHandler` 注册的 handler 收到的 `error` 一定是 `Error`
- 若原始异常非 `Error`，则 handler 收到的 `error.cause === raw`

### C) `dispatchError` / `ErrorToken` 语义

- `dispatchError` 的入参 `error` 在本 spec 约束下为 `Error`（由上游 `runWithChannel` 保证）。
- `ErrorToken.error` 类型为 `Error`，存放 **normalized error**。

## 对外 API 变更

为匹配“只处理正确错误类型”的目标，对外签名应收紧为 `Error`：

- `ErrorHandler: (error: Error, context: ErrorContext, payload?: ErrorPayload) => void`
- `ErrorToken.error: Error`
- `dispatchError(error: Error, options): ErrorToken`
- `handleError(error: Error, payload, shouldRethrowAsync?): void`
- `ErrorToken.meta`（若存在）不要求承载原始异常值，因为 `cause` 已可表达。

## Tick-local 去重（同一 tick 内只通知一次）

### 前提（当前实现）

本策略依赖一个重要前提：**当前错误捕获入口是同步的（sync-only）**。

- `runWithChannel` 仅能捕获同步 `throw`。
- 对 Promise/thenable runner 目前是拒绝策略（会同步抛出 TypeError 并走错误通道）。
- 代码中虽存在 `handlerPhase: 'async'` 与 `queueMicrotask`（用于兜底重抛），但并未提供“捕获 Promise reject 并上报”的异步入口。

在该前提下，嵌套的 `runSilent/runThrowing`、scheduler/cleanup 等入口对同一异常的重复捕获，通常发生在同一 tick 内。

### 目标语义

- 同一 tick 内：同一个 `Error` 引用只通知一次（减少嵌套通道重复上报噪声）。
- 跨 tick：即便是同一个 `Error` 对象再次抛出，也应再次通知（避免隐藏真实的第二次错误）。

### 建议实现（仅描述行为）

- 使用 `WeakSet<Error>` 作为“本 tick 已通知错误”的 registry。
- 首次登记时安排一次 `queueMicrotask`：在 microtask 队列阶段将 registry 重置为新的 `WeakSet`。
  - 由于 `WeakSet` 不支持 `clear()`，需通过“替换为新实例”的方式完成重置。
  - 同一 tick 内只允许调度一次重置（使用布尔 flag 去重 microtask）。

### 验收测试建议

1. 同一 tick 内重复：同一 `Error` 连续 `dispatchError(error, ...)` 两次，handler 只调用一次。
2. 跨 tick 仍上报：`await Promise.resolve()`（或等价触发 microtask）后，再次 `dispatchError` 同一 `Error`，handler 总调用次数应为 2。

说明：

- 由于 tick-local 去重需要调度一次 `queueMicrotask` 来重置 registry，在 `handlerPhase: 'async'` 且未注册 handler 的场景中，可能会观测到两次 microtask：一次用于重置 registry，一次用于兜底异步重抛。

## 未来考虑（引入 async 捕获入口时）

若未来支持真正的异步错误捕获入口（例如新增 `runWithChannelAsync` 并对 Promise 返回值挂 `.catch(dispatchError)`，或支持 async setup/watch 回调），则“tick-local 去重”可能不足以准确表达“同一逻辑链路”。

届时需要重新评估去重边界，可能的方向包括：

- 以“链路 id / 上下文 token”作为去重维度（同一链路只通知一次）。
- 或者明确放弃框架层去重，将聚合/节流交给 `setErrorHandler` 的上层实现。

## 兼容性与迁移说明

- 这会改变一种边界行为：此前 `runThrowing` 可能会把原始值（如字符串）原样抛出；按照本 spec，将改为抛出 `Error`。
- 对外 API 签名收紧为 `Error`（例如 handler 入参、token.error），调用方不再需要自行兜底转换。

## 建议测试用例（Vitest）

在 `test/shared/error-channel.test.ts` 补充：

1. `runThrowing` 会把 primitive 包装成 `Error` 并同步抛出
   - runner：`throw 'boom'`
   - 期望：捕获到 `Error`
   - 期望：`error.message === 'boom'`
   - 期望：`error.cause === 'boom'`

2. `runSilent` 会把 primitive 包装成 `Error` 并通知 handler
   - runner：`throw 1`
   - 期望：不抛出
   - 期望：handler 被调用一次
   - 期望：handler 收到的 `error` 为 `Error` 且 `cause === 1`

3. 嵌套通道仍应只上报一次（若仍保留对象引用去重策略）
   - runner：内层 `throw 'boom'`，外层再捕获
   - 期望：handler 只被调用一次
   - 说明：该断言依赖是否保留去重策略；若后续去重策略另行调整，需要同步更新此用例。

状态：以上用例已在 `test/shared/error-channel.test.ts` 覆盖（包含跨 tick 再上报的断言）。
