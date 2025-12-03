# 公共 API 错误处理问题记录

## 1. `scheduler` 抛错会终止整条触发链（待修复）

- 位置：`src/reactivity/internals/dependency-utils.ts`
- 现状：`schedule()` 直接调用用户注入的 `scheduler(job)`，缺少 `try...catch` 包裹；一旦 `scheduler` 抛错，当前触发流程会被迫中断，已截获到的其他副作用无法继续执行，且没有复位机制。
- 影响：复杂调度（批量队列/微任务）中某个 job 抛错会导致同一批次的其他副作用全部“失联”，难以定位问题，同时 effect 栈状态可能保持一致但外部逻辑被跳过。
- 提示：应当在 `schedule()` 内对 `scheduler(job)` 做错误隔离，至少保证调度例程失败时不会阻止后续 `triggerEffects`，并为错误传播提供统一出口（可参考 Vue 的 `handleError`）。

## 2. Scope 与组件清理任务缺少容错（待修复）

- 位置：`src/reactivity/effect-scope.ts`、`src/runtime-core/renderer/mount-component.ts`
- 现状：无论是 `EffectScope.stop()` 遍历的 `cleanups`/子 scope，还是 `teardownComponentInstance()` 中逐一执行的组件级 `cleanupTasks`，都直接调用用户注册方法；若其中任意一个抛错，后续清理将不会执行，进而留下活动的副作用或 DOM 引用。
- 影响：使用 `onScopeDispose`/组件清理钩子管理外部资源（如事件监听、定时器）时，只要某个 cleanup 失败，其余资源可能永久泄漏，和“Scope 能保证全部清理”的预期不符。
- 提示：遍历执行 cleanup 时需加上 `try...catch`（或 `try...finally`），确保单个清理失败不会阻断剩余清理，同时可以收集/上报错误信息以便开发者处理。

## 3. 用户注册的 cleanup/setter 未加保护（待修复）

- 位置：`src/reactivity/watch/core.ts`、`src/reactivity/ref/computed.ts`
- 现状：
  - `watch` 回调通过 `onCleanup` 注册的清理函数在下一轮触发前直接执行，没有任何错误捕获；与 Scope/组件清理类似，异常会中断后续逻辑（包括 `oldValue` 更新）。
  - `computed` 的可写 `setter` 在 `set value()` 中裸调，若 setter 抛错，`triggerEffects` 不会执行，但也没有恢复/提示机制。
- 影响：开发者在 cleanup/setter 中稍有失误，就可能破坏 `watch`/`computed` 的内部状态或导致调试困难。
- 提示：在调用 cleanup/setter 前后增加 `try...catch`，并视需要暴露统一的错误处理钩子，保持与 `effect`/`scope` 一致的容错策略。
