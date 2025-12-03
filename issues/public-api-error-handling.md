# 公共 API 错误处理问题记录

## 1. `scheduler` 抛错会终止整条触发链（已修复）

- 位置：`src/reactivity/internals/dependency-utils.ts`
- 现状：2025-12-03 起 `schedule()` 已通过 `try...catch` 捕获 `scheduler(job)` 的异常，并转发至 `handleReactivityError`，同时继续执行剩余副作用，避免触发链被中断。
- 影响：调度阶段的单个 job 抛错只会被统一错误处理器捕获，不再影响同批次的其他副作用。
- 提示：如需进一步定制上报行为，可通过 `setReactivityErrorHandler` 统一处理。

## 2. Scope 与组件清理任务缺少容错（已修复）

- 位置：`src/reactivity/effect-scope.ts`、`src/runtime-core/renderer/mount-component.ts`
- 现状：2025-12-03 起 `EffectScope.stop()` 在停止内部 effect、执行 `onScopeDispose` 回调以及级联子 scope 时，都会捕获异常并通过 `handleReactivityError(..., 'effect-scope-cleanup')` 上报，随后继续处理剩余任务；组件卸载阶段则在 `teardownComponentInstance()` 内对 `cleanupTasks` 逐一包裹 `try...catch` 并使用 `'component-cleanup'` 上下文。
- 影响：单个 cleanup 抛错只会进入统一处理器，其他副作用、子 scope 或组件级清理动作仍会执行完成，避免资源泄漏。
- 提示：如需侦听这些错误，可通过 `setReactivityErrorHandler` 统一收集与上报。

## 3. 用户注册的 cleanup/setter 未加保护（部分已修复）

- 位置：`src/reactivity/watch/core.ts`、`src/reactivity/ref/computed.ts`
- 现状：
  - `watch` 在触发回调时已通过 `try...catch` 统一调用 `handleReactivityError`，并在 `finally` 中维持旧值与 cleanup 的更新，避免异常中断内部状态；但回调通过 `onCleanup` 注册的清理函数仍缺少容错。
  - `computed` 的可写 `setter` 在 `set value()` 中仍无错误捕获，若 setter 抛错会导致 `triggerEffects` 被跳过且没有提示机制。
- 影响：`watch` 回调本体的错误已不会破坏触发链，但 cleanup 与 computed setter 的异常仍可能导致资源泄漏或状态失真。
- 提示：后续需为 cleanup 与 computed setter 增加错误隔离，复用 `handleReactivityError`，以达到与 effect/scope 相同的容错策略。
