# 公共 API 错误处理问题记录

## 1. `scheduler` 抛错会终止整条触发链（已修复，已验证）

- 位置：`src/reactivity/internals/dependency-utils.ts`
- 现状：2025-12-03 起 `schedule()` 已通过 `try...catch` 捕获 `scheduler(job)` 的异常，并转发至 `handleMiniError`，同时继续执行剩余副作用，避免触发链被中断。
- 影响：调度阶段的单个 job 抛错只会被统一错误处理器捕获，不再影响同批次的其他副作用。
- 提示：如需进一步定制上报行为，可通过 `setMiniErrorHandler` 统一处理。

## 2. Scope 与组件清理任务缺少容错（已修复，已验证）

- 位置：`src/reactivity/effect-scope.ts`、`src/runtime-core/renderer/mount-component.ts`
- 现状：2025-12-03 起 `EffectScope.stop()` 在停止内部 effect、执行 `onScopeDispose` 回调以及级联子 scope 时，都会捕获异常并通过 `handleMiniError(..., 'effect-scope-cleanup')` 上报，随后继续处理剩余任务；组件卸载阶段则在 `teardownComponentInstance()` 内对 `cleanupTasks` 逐一包裹 `try...catch` 并使用 `'component-cleanup'` 上下文。
- 影响：单个 cleanup 抛错只会进入统一处理器，其他副作用、子 scope 或组件级清理动作仍会执行完成，避免资源泄漏。
- 提示：如需侦听这些错误，可通过 `setMiniErrorHandler` 统一收集与上报。

## 3. 用户注册的 cleanup/setter 未加保护（已修复，已验证）

- 位置：`src/reactivity/watch/core.ts`、`src/reactivity/ref/computed.ts`
- 现状：
  - `watch` 在每次触发前会通过 `runRegisteredCleanup` 安全执行上一轮 `onCleanup` 注册的回调；若 cleanup 抛错，将调用 `handleMiniError(..., 'watch-cleanup')` 并继续流程，并在 stop 阶段复用同样策略。
  - 可写 `computed` 在 `set value()` 中包裹 `try...catch`，若自定义 setter 抛错，会先通过 `handleMiniError(..., 'computed-setter')` 上报，再将原始异常同步抛出，便于调用方处理。
- 影响：`watch` cleanup 抛错不再阻断后续回调或 stop 清理，`computed` setter 的异常也能被统一上报并保留原有同步抛错语义。
- 提示：框架使用者可通过 `setMiniErrorHandler` 监听 cleanup/setter 的异常，进行日志或自定义修复。

## 4. Effect 内部清理任务缺少容错（已修复，已验证）

- 位置：`src/reactivity/effect.ts`
- 现状：2025-12-03 起 `ReactiveEffect.flushDependencies()` 在执行 `cleanupTasks` 时，会对每个 cleanup 函数包裹 `try...catch`，若抛错则通过 `handleMiniError(..., 'effect-cleanup')` 上报，随后继续执行剩余清理任务。
- 影响：嵌套 effect 的清理回调（如父 effect 停止时触发的子 effect `stop()`）抛错不再阻断后续清理，避免资源泄漏或部分清理未完成的情况。
- 提示：通过 `setMiniErrorHandler` 可统一监听这些内部清理阶段的异常。
