# Shared Error Channel 模块问题记录

## 1. `runWithChannel` 不支持 Promise runner，导致异步异常漏报且上下文过早清理（已修复）

- 位置：`src/shared/error-channel.ts`
- 现状：`runWithChannel` 直接 `return runner()` 并依赖 `try/catch/finally` 捕获异常与执行 `afterRun`。
  - 当 `runner` 返回 Promise 时：
    - Promise 的 reject 不会进入当前 `catch`（只能捕获同步 throw）。
    - `finally` 会在 Promise settled 之前同步执行，因此 `afterRun`（以及它可能包含的上下文栈 pop/清理）会过早发生。
- 影响：
  - 异步异常不会被 `dispatchError/handleError` 捕获，导致错误处理器漏报。
  - 嵌套上下文（例如 effect/scope 栈、追踪上下文）在异步操作期间提前被清理，可能引发错误归因、依赖收集紊乱或资源泄漏/误释放。
- 处理：运行时增加 thenable 检测，Promise/thenable 返回会抛出 TypeError 并走错误通道。

## 2. `runWithChannel` 的 `beforeRun` 在 `try/finally` 外执行，抛错会跳过 `afterRun`（已修复）

- 位置：`src/shared/error-channel.ts`
- 现状：`options.beforeRun?.()` 在进入 `try {}` 之前执行。
- 影响：
  - 若 `beforeRun` 抛错（例如 push 栈、准备上下文时发生异常），`finally` 不会执行，`afterRun` 被跳过。
  - 对“成对出现”的资源管理（push/pop、enter/exit）会造成泄漏或上下文栈残留。
- 提示：
  - 将 `beforeRun` 纳入同一个 `try/finally` 保护范围，保证只要执行过 `beforeRun`，最终就一定会执行 `afterRun`。
  - 如果需要区分“beforeRun 未成功”场景，可在 `afterRun` 侧根据 token 或额外标记做条件清理。

## 3. `runThrowing` 与 `handlerPhase: 'async'` 组合会造成同步抛错 + 异步重抛的双重错误（已修复）

- 位置：`src/shared/error-channel.ts`、`src/shared/error-handling.ts`
- 现状：
  - `dispatchError` 在 `handlerPhase === 'async'` 时会启用 `shouldRethrowAsync`，最终通过 `queueMicrotask` 异步重抛一次。
  - 但 `runWithChannel` 在 `propagate === 'throw'`（即 `runThrowing`）时仍会在 `catch` 中同步 `throw error`。
- 影响：
  - 同一个异常会被同步抛出一次，同时又在 microtask 阶段再抛出一次，导致：
    - 控制台/测试中出现双份错误报告。
    - 上层错误边界/测试 runner 可能出现重复失败或不可预测的错误处理顺序。
- 处理：
  - 通过 `ThrowingErrorRunOptions` 类型将 `runThrowing` 的 `handlerPhase` 限定为 `sync`，编译期阻止异步阶段配置，避免双重抛错。

## 4. 错误通道允许抛出非 `Error`，导致对外 API 与错误语义不稳定（已修复）

- 位置：`src/shared/error-channel.ts`、`src/shared/error-handling.ts`
- 现状（修复前）：
  - `runWithChannel` 捕获到的异常类型为 `unknown`，可能是字符串/数字等原始值。
  - 对外 `ErrorHandler` 与 `ErrorToken.error` 也使用 `unknown`，导致调用方必须自行兜底转换，错误语义（stack/message/cause）不稳定。
- 影响：
  - 调用方（以及框架内部上报链路）可能接收到非 `Error`，不利于调试与日志聚合。
  - 也会弱化错误去重的有效性：非 `Error` 无法依赖对象引用语义进行一致处理。
- 处理：
  - 在错误捕获点统一做异常规范化：非 `Error` 统一包装为 `new Error(String(raw), { cause: raw })`，并将规范化后的 `Error` 用于上报、写入 token 以及 `runThrowing` 的重新抛出。
  - 对外 API 收紧为 `Error`：`ErrorHandler(error: Error, ...)`、`ErrorToken.error: Error`、`dispatchError(error: Error, ...)`、`handleError(error: Error, ...)`。
- 说明：详细规格见 `docs/issues/error-channel-normalization-spec.md`。

补充（去重策略）：

- `dispatchError` 的错误去重为 tick-local：同一 tick 内同一 `Error` 引用只通知一次，并会在 microtask 阶段重置 registry，确保跨 tick 再次抛出同一 `Error` 仍会再次上报。
