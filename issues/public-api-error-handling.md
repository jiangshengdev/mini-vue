# 公共 API 错误处理问题记录

## 1. `scheduler` 抛错会终止整条触发链（已修复）

- 位置：`src/reactivity/internals/dependency-utils.ts`
- 现状：2025-12-03 起 `schedule()` 已通过 `try...catch` 捕获 `scheduler(job)` 的异常，并转发至 `handleReactivityError`，同时继续执行剩余副作用，避免触发链被中断。
- 影响：调度阶段的单个 job 抛错只会被统一错误处理器捕获，不再影响同批次的其他副作用。
- 提示：如需进一步定制上报行为，可通过 `setReactivityErrorHandler` 统一处理。

## 2. Scope 与组件清理任务缺少容错（待修复）

- 位置：`src/reactivity/effect-scope.ts`、`src/runtime-core/renderer/mount-component.ts`
- 现状：无论是 `EffectScope.stop()` 遍历的 `cleanups`/子 scope，还是 `teardownComponentInstance()` 中逐一执行的组件级 `cleanupTasks`，都直接调用用户注册方法；若其中任意一个抛错，后续清理将不会执行，进而留下活动的副作用或 DOM 引用。
- 影响：使用 `onScopeDispose`/组件清理钩子管理外部资源（如事件监听、定时器）时，只要某个 cleanup 失败，其余资源可能永久泄漏，和“Scope 能保证全部清理”的预期不符。
- 提示：遍历执行 cleanup 时需加上 `try...catch`（或 `try...finally`），确保单个清理失败不会阻断剩余清理，同时可以收集/上报错误信息以便开发者处理。

## 3. 用户注册的 cleanup/setter 未加保护（部分已修复）

- 位置：`src/reactivity/watch/core.ts`、`src/reactivity/ref/computed.ts`
- 现状：
  - `watch` 在触发回调时已通过 `try...catch` 统一调用 `handleReactivityError`，并在 `finally` 中维持旧值与 cleanup 的更新，避免异常中断内部状态；但回调通过 `onCleanup` 注册的清理函数仍缺少容错。
  - `computed` 的可写 `setter` 在 `set value()` 中仍无错误捕获，若 setter 抛错会导致 `triggerEffects` 被跳过且没有提示机制。
- 影响：`watch` 回调本体的错误已不会破坏触发链，但 cleanup 与 computed setter 的异常仍可能导致资源泄漏或状态失真。
- 提示：后续需为 cleanup 与 computed setter 增加错误隔离，复用 `handleReactivityError`，以达到与 effect/scope 相同的容错策略。
