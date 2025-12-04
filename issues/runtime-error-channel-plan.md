# 统一错误通道重构计划

## 背景

此前我们尝试在组件链路中局部接入 `callWithMiniErrorHandling`，希望消除 `invokeSetup` 内手写的 `hasSetupError/setupError` 模板。然而由于 `effectScope.run` 仍保留自己的 `try...catch + handleRuntimeError`，同一异常被按 `component-setup` 与 `effect-scope-run` 上报两次。为避免重复告警，我们又引入临时标记变量手动重抛，结果导致“写了几百行代码也没能删除 `if (hasSetupError) { throw setupError }`”。

根因是：错误处理语义分散在各个入口（scope、effect、scheduler、组件 setup/watch/computed 等），缺少统一的“错误通道”。只要任何一层需要自定义行为，就会重新堆叠 `try...catch`，既难以维护，也让上下文不清晰。

## 总体目标

- 建立中心化的错误通道（Error Channel），所有运行时入口通过 declarative 配置描述：`origin`、`propagate`、`handlerPhase` 和 `meta`。
- 消除 `hasSetupError` 等手动缓存逻辑，确保“同一个异常只在准确的上下文上报一次”，同时保留同步/异步抛错语义。
- 让 `setRuntimeErrorHandler` 成为唯一对外扩展点；未来扩展生命周期、hooks 或异步调度时无需再写重复模板。
- 用系统化测试覆盖新的错误通道，回归所有受影响模块（reactivity、runtime-core、runtime-dom、watch/computed）。

## 迭代路线

1. **Error Channel 基础设施（已完成）**
   - 新增 `src/shared/runtime-error-channel.ts`：导出 `runWithErrorChannel()`、`dispatchRuntimeError()`、`RuntimeErrorToken`。
   - `runWithErrorChannel(fn, options)` 负责 before/after hook + 错误捕获；`options` 至少包含 `origin`、`propagate`（`runtimeErrorPropagationStrategies.sync | runtimeErrorPropagationStrategies.silent`）、`handlerPhase`（`runtimeErrorPropagationStrategies.sync | runtimeErrorHandlerPhases.async`）、`meta`、`rethrowAsyncFallback`。
   - `dispatchRuntimeError` 内部维护 `WeakSet<object>`，避免相同 `error` 在不同 origin 被重复上报；未注册 handler 且 `handlerPhase === runtimeErrorHandlerPhases.async` 时才 fallback 到 `queueMicrotask`。
   - 状态：2025-12-04 已完成，新增 `src/shared/runtime-error-channel.ts` 与配套用例 `test/shared/runtime-error-channel.test.ts` 覆盖去重、同步/吞错与异步抛错语义。

2. **EffectScope 与 ReactiveEffect 接入（已完成）**
   - 重写 `EffectScope.run`：不再直接 `try...catch`，而是调用 `runWithErrorChannel(fn, { origin: runtimeErrorContexts.effectScopeRun, propagate: runtimeErrorPropagationStrategies.sync, handlerPhase: runtimeErrorPropagationStrategies.sync, beforeRun, afterRun })`。
   - `ReactiveEffect.run` 同理，声明 `origin: runtimeErrorContexts.effectRunner`；`stop`/`flushDependencies` 内部的 cleanup 也改用 channel（`origin: runtimeErrorContexts.effectCleanup`, `propagate: runtimeErrorPropagationStrategies.silent`）。
   - 此阶段要通过所有 reactivity 层测试，验证基础设施稳定。
   - 状态：2025-12-04 已完成，`EffectScope.run/stop` 与 `ReactiveEffect.run/flushDependencies` 均接入 Error Channel，并通过 `test/reactivity/effect.test.ts`、`test/reactivity/watch.test.ts` 回归。

3. **组件链路迁移（已完成）**
   - `invokeSetup` 调用 `instance.scope.run(() => ..., { origin: runtimeErrorContexts.componentSetup, propagate: runtimeErrorPropagationStrategies.sync })`，彻底删掉 `hasSetupError`。
   - rerender scheduler、`teardownComponentInstance` cleanup、`createApp` 卸载路径等，按需声明 `origin: runtimeErrorContexts.scheduler | runtimeErrorContexts.componentCleanup`。
   - 对应的 runtime-dom 测试（setup 抛错、scheduler 报错、cleanup 抛错）应验证“仅一次 handler 调用 + 同步抛错”。
   - 状态：2025-12-04 已完成，`invokeSetup`、rerender 调度与组件 cleanup 均接入 Error Channel，并通过 `test/runtime-dom/component-reactivity.test.tsx` 验证 setup/cleanup 报错只通知一次。

4. **响应式辅助 API 迁移（已完成）**
   - `watch` 回调、`watch` cleanup、`computed` setter、`dependency-utils` 调度器、`effect-scope-stop` 等全部使用 error channel。
   - 期间评估是否需要暴露 `meta`（如 `componentName`、`effectId`）以提升可观测性。
   - 状态：2025-12-04 已完成，`watch` 回调/cleanup、`computed` setter 与依赖调度器统一走 Error Channel，并通过 `test/reactivity/watch.test.ts`、`test/reactivity/computed.test.ts` 回归。

5. **测试与文档交付（已完成）**
   - 回归 `test/reactivity/**/*`、`test/runtime-dom/**/*`、`test/jsx-runtime/**/*`。
   - 新增 Error Channel 专用单测：
     - 同一异常被不同 origin 调用时只通知一次。
     - `propagate: runtimeErrorPropagationStrategies.silent` 场景不会抛出到调用栈。
     - handler 未注册 + `handlerPhase: runtimeErrorHandlerPhases.async` 时确实异步抛错。
   - 更新 `issues/runtime-error-handling-plan.md`、`docs/*`（若有）以及开发说明，标记旧方案废弃并记录新语义。
   - 状态：2025-12-04 已完成，`pnpm vitest run` 覆盖 15 个文件共 98 个用例全部通过，并补充 `issues/public-api-error-handling.md` 中的统一错误通道说明。

## 下一阶段：错误处理精简计划

1. **现状审计**：全面搜索 `RuntimeErrorContext`、`handleRuntimeError` 与 `setRuntimeErrorHandler` 的引用，确认唯一入口已转向 `runtime-error-channel.ts`，记录仍需保留的上下文字段。
2. **API 抽象重整**：在 `runtime-error-channel.ts` 中直接导出上下文类型，`error-handling.ts` 缩减为 handler 注册 + 异步兜底；评估是否改名为 `error-channel-adapter.ts` 以贴合角色。
3. **适配层精简**：删除冗余的上下文联合、重复注释与过期选项，统一通过 `dispatchRuntimeError` 提供的 `detail` 结构向外暴露元信息。
4. **全局迁移与清理**：批量更新 reactivity/runtime/dom 文件中的类型导入，仅依赖通道层，同时检查 `meta` 传值是否需要扩展（如组件名、effect id）。
5. **测试与文档更新**：补充面向新 API 的单测，重点覆盖 handler 缺失、`propagate` 语义与 token 去重；同步更新 `issues/public-api-error-handling.md`、`docs/*` 里的指引以声明“错误通道是唯一入口，handler API 已精简”。

### 精简阶段进度

- 2025-12-04：完成步骤 1（审计）与步骤 2（API 抽象重整），`RuntimeErrorContext` 已迁移至 `runtime-error-channel.ts` 并在公共入口 (`src/index.ts` / `src/reactivity/index.ts`) 对外导出。
- 2025-12-04：完成步骤 3（适配层精简），`handleRuntimeError` 现直接消费通道产出的 `detail` 并移除冗余 `MiniErrorOptions`，同时要求 `handlerPhase` 明确传入，减少重复结构。
- 2025-12-04：完成步骤 4（全局迁移与清理），上下文类型现仅在 `runtime-error-channel.ts` 定义一次，`error-handling.ts` 直接复用并对外导出，避免重复维护。
- 2025-12-04：对外 API 统一更名为 `setRuntimeErrorHandler`/`RuntimeErrorHandler`，彻底移除 `Mini*` 前缀，不再保留兼容别名。
- 2025-12-04：步骤 5（测试与文档更新）已补充公共问题记录 `issues/public-api-error-handling.md`，描述新的 `RuntimeErrorContext` 与精简后的 `handleRuntimeError` 语义；后续若扩充测试再追加记录。

## 案例验收标准

- 仓库内不再有 `hasSetupError`/`setupError` 一类的临时缓存逻辑。
- `pnpm vitest run test/runtime-dom/component-reactivity.test.tsx` 中“setup 抛错会通知错误处理器并保持同步抛错”断言稳定，只收到一次 handler 调用。
- 所有入口若声明 `propagate: runtimeErrorPropagationStrategies.sync`，调用方能捕获到原始异常；若声明 `propagate: runtimeErrorPropagationStrategies.silent`，异常不会窜出当前调用栈。
- 新增的 Error Channel 测试覆盖率 ≥ 90%，并在 CI 中开启。

## 风险与缓解

- **广泛触及多个子系统**：先在 `feature/error-channel` 分支串行完成迭代路线，多次提交，避免一次性巨量修改。
- **调试回归难度**：引入 `meta` 结构体记录组件名、effect id、容器等信息，帮助定位。
- **潜在性能影响**：`runWithErrorChannel` 添加的钩子需保持轻量（少量函数调用 + `WeakSet` 查询），必要时在基准测试中验证。

## 待办评估

- [x] 基础设施原型 & review
- [x] reactivity 层迁移
- [x] runtime-core / runtime-dom 迁移
- [x] 测试/文档更新
- [ ] 监控 meta 设计评审
- [ ] 错误处理 API 精简
