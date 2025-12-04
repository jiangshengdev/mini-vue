# 公共 API 错误处理问题记录

## 1. `scheduler` 抛错会终止整条触发链（已修复）

- 位置：`src/reactivity/internals/dependency-utils.ts`
- 现状：2025-12-03 起 `schedule()` 已通过 `try...catch` 捕获 `scheduler(job)` 的异常，并转发至 `handleRuntimeError`，同时继续执行剩余副作用，避免触发链被中断。
- 影响：调度阶段的单个 job 抛错只会被统一错误处理器捕获，不再影响同批次的其他副作用。
- 提示：如需进一步定制上报行为，可通过 `setRuntimeErrorHandler` 统一处理。

## 2. Scope 与组件清理任务缺少容错（已修复）

- 位置：`src/reactivity/effect-scope.ts`、`src/runtime-core/renderer/mount-component.ts`
- 现状：2025-12-03 起 `EffectScope.stop()` 在停止内部 effect、执行 `onScopeDispose` 回调以及级联子 scope 时，都会捕获异常并通过 `handleRuntimeError(..., 'effect-scope-cleanup')` 上报，随后继续处理剩余任务；组件卸载阶段则在 `teardownComponentInstance()` 内对 `cleanupTasks` 逐一包裹 `try...catch` 并使用 `'component-cleanup'` 上下文。
- 影响：单个 cleanup 抛错只会进入统一处理器，其他副作用、子 scope 或组件级清理动作仍会执行完成，避免资源泄漏。
- 提示：如需侦听这些错误，可通过 `setRuntimeErrorHandler` 统一收集与上报。

## 3. 用户注册的 cleanup/setter 未加保护（已修复）

- 位置：`src/reactivity/watch/core.ts`、`src/reactivity/ref/computed.ts`
- 现状：
  - `watch` 在每次触发前会通过 `runRegisteredCleanup` 安全执行上一轮 `onCleanup` 注册的回调；若 cleanup 抛错，将调用 `handleRuntimeError(..., 'watch-cleanup')` 并继续流程，并在 stop 阶段复用同样策略。
  - 可写 `computed` 在 `set value()` 中包裹 `try...catch`，若自定义 setter 抛错，会先通过 `handleRuntimeError(..., 'computed-setter')` 上报，再将原始异常同步抛出，便于调用方处理。
- 影响：`watch` cleanup 抛错不再阻断后续回调或 stop 清理，`computed` setter 的异常也能被统一上报并保留原有同步抛错语义。
- 提示：框架使用者可通过 `setRuntimeErrorHandler` 监听 cleanup/setter 的异常，进行日志或自定义修复。

## 4. effect 内部 cleanup 抛错会中断 flush（已修复）

- 位置：`src/reactivity/effect.ts`
- 现状：2025-12-03 起 `ReactiveEffect.flushDependencies()` 会在遍历 `registerCleanup()` 注册的回调时使用 `try...catch` 包裹，并通过 `handleRuntimeError(..., 'effect-cleanup')` 上报异常后继续执行剩余清理任务。
- 影响：当 `watch`、嵌套 effect 等注册的清理逻辑抛错时，不会再阻断后续 cleanup 或 effect 重跑，整条触发链得以保持完整。
- 提示：如需跟踪此类错误，可依旧调用 `setRuntimeErrorHandler` 并关注 `'effect-cleanup'` 上下文。

## 5. 统一错误通道缺失导致重复告警（已修复）

- 位置：`src/shared/runtime-error-channel.ts`、`src/reactivity/watch/core.ts`、`src/reactivity/ref/computed.ts`、`src/reactivity/internals/dependency-utils.ts` 等入口。
- 现状：2025-12-04 起所有运行时入口改用 `runWithErrorChannel()` 描述 `origin`、`propagate`、`handlerPhase` 与 `meta`，`dispatchRuntimeError()` 负责去重并在未注册 handler 且 `handlerPhase === runtimeErrorHandlerPhases.async` 时回退 `queueMicrotask`。`watch` 回调/cleanup、`computed` setter 以及自定义 `scheduler(job)` 均接入该通道。
- 影响：同一个异常只会在首个 origin 上报一次，且可根据 `propagate` 控制是否同步抛错，再也无需 `hasSetupError` 之类的临时代码。外部通过 `setRuntimeErrorHandler` 即可拿到包含 `detail.origin`、`detail.meta`、`detail.token` 的完整上下文。
- 提示：如需扩展新的生命周期或异步任务，只需声明对应的 `origin` 并复用 `runWithErrorChannel`，无需手写 `try...catch`。

## 6. 错误处理适配层重复定义上下文（已修复）

- 位置：`src/shared/runtime-error-channel.ts`、`src/shared/error-handling.ts`
- 现状：2025-12-04 起 `RuntimeErrorContext` 仅在错误通道文件中定义一次，`error-handling.ts` 直接复用并导出该类型；`handleRuntimeError` 也只接受通道生成的 `detail`（包含 `handlerPhase`、`meta`、`token`）并以第三个参数控制异步兜底，无需再传 `MiniErrorOptions`。
- 影响：上下文定义只保留一份，避免多处维护导致语义偏差；同时暴露给用户的 detail 字段保持稳定，便于在 `setRuntimeErrorHandler` 内统一处理。
- 提示：如需监听新的生命周期，只需扩展 `RuntimeErrorContext` 并通过 `runWithErrorChannel` 提供 `meta` 信息；外部 handler 会同步收到 `origin`/`handlerPhase`/`token` 等细节。
