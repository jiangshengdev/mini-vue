# Shared Error Channel 模块问题记录

## 1. `runWithChannel` 不支持 Promise runner，导致异步异常漏报且上下文过早清理（待修复）

- 位置：`src/shared/error-channel.ts`
- 现状：`runWithChannel` 直接 `return runner()` 并依赖 `try/catch/finally` 捕获异常与执行 `afterRun`。
  - 当 `runner` 返回 Promise 时：
    - Promise 的 reject 不会进入当前 `catch`（只能捕获同步 throw）。
    - `finally` 会在 Promise settled 之前同步执行，因此 `afterRun`（以及它可能包含的上下文栈 pop/清理）会过早发生。
- 影响：
  - 异步异常不会被 `dispatchError/handleError` 捕获，导致错误处理器漏报。
  - 嵌套上下文（例如 effect/scope 栈、追踪上下文）在异步操作期间提前被清理，可能引发错误归因、依赖收集紊乱或资源泄漏/误释放。
- 提示：
  - 明确该通道是否支持异步 runner：
    - 若不支持：应在运行时检测 Promise/thenable 并抛出更明确的错误（或在类型上禁止）。
    - 若需要支持：`runWithChannel` 需要区分同步/异步返回值，对 Promise 链接 `.then/.catch/.finally`，保证 `afterRun` 在 settle 后执行，并在 reject 时走 `dispatchError`。

## 2. `runWithChannel` 的 `beforeRun` 在 `try/finally` 外执行，抛错会跳过 `afterRun`（待修复）

- 位置：`src/shared/error-channel.ts`
- 现状：`options.beforeRun?.()` 在进入 `try {}` 之前执行。
- 影响：
  - 若 `beforeRun` 抛错（例如 push 栈、准备上下文时发生异常），`finally` 不会执行，`afterRun` 被跳过。
  - 对“成对出现”的资源管理（push/pop、enter/exit）会造成泄漏或上下文栈残留。
- 提示：
  - 将 `beforeRun` 纳入同一个 `try/finally` 保护范围，保证只要执行过 `beforeRun`，最终就一定会执行 `afterRun`。
  - 如果需要区分“beforeRun 未成功”场景，可在 `afterRun` 侧根据 token 或额外标记做条件清理。

## 3. `runThrowing` 与 `handlerPhase: 'async'` 组合会造成同步抛错 + 异步重抛的双重错误（待修复）

- 位置：`src/shared/error-channel.ts`、`src/shared/error-handling.ts`
- 现状：
  - `dispatchError` 在 `handlerPhase === 'async'` 时会启用 `shouldRethrowAsync`，最终通过 `queueMicrotask` 异步重抛一次。
  - 但 `runWithChannel` 在 `propagate === 'throw'`（即 `runThrowing`）时仍会在 `catch` 中同步 `throw error`。
- 影响：
  - 同一个异常会被同步抛出一次，同时又在 microtask 阶段再抛出一次，导致：
    - 控制台/测试中出现双份错误报告。
    - 上层错误边界/测试 runner 可能出现重复失败或不可预测的错误处理顺序。
- 提示：
  - 明确 `handlerPhase` 的语义边界：
    - 若 `runThrowing` 的目标是“同步向上传播”，则不应与 “async 阶段异步兜底重抛” 同时启用。
  - 可选修复方向：
    - 在 `runThrowing` 分支遇到 `handlerPhase: 'async'` 时，自动关闭 `shouldRethrowAsync`（避免双抛）。
    - 或者约束 `runThrowing` 只能使用 `handlerPhase: 'sync'`，并在 dev 直接断言提示。

## 4. 错误去重 registry 使用 `WeakSet`，无法对原始类型错误去重（待修复）

- 位置：`src/shared/error-channel.ts`
- 现状：`notifiedErrorRegistry` 为 `WeakSet<PlainObject>`，并且只对 `isObject(error)` 为 true 的错误做去重登记。
- 影响：
  - 当异常为字符串、数字等原始类型时无法去重，可能在重试/重复触发场景下多次进入错误处理器，造成噪声。
- 提示：
  - 采用“双轨”结构：对象错误用 `WeakSet<object>` 去重，原始类型错误用 `Set<unknown>`（或 `Set<string | number | symbol | bigint | boolean | null | undefined>`）去重。
  - 或者在错误通道统一将非 Error/非对象规范化为 Error 实例（注意保留 `cause`），再用对象去重。
