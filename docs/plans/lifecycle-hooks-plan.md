# 计划：生命周期钩子（Lifecycle Hooks）

实现组件级生命周期钩子 `onMounted` / `onUnmounted` / `onBeforeUpdate` / `onUpdated`，补齐 `runtime-core` 的组件模型能力，并与现有 scheduler（`pre`/`post` flush 队列、`nextTick`）对齐时序，尽量贴近 Vue 3 Composition API 的使用体验。

## Scope

- In: Hook 注册 API、实例存储结构、挂载/更新/卸载触发点接入、错误处理策略、测试与文档补齐。
- Out: Options API 生命周期、KeepAlive（activated/deactivated）、异步 setup、SSR/水合特化实现。

## 实现状态

- 状态：已完成
- 关键实现：`src/runtime-core/component/lifecycle.ts`、`src/runtime-core/component/render-effect.ts`、`src/runtime-core/component/teardown.ts`
- 测试：`test/runtime-core/component/lifecycle-hooks.test.tsx`
- 汇总入口：`docs/plans/next-features-plan.md`

## 背景与现状

- 位置：`src/runtime-core/component/context.ts`、`src/runtime-core/component/instance.ts`
- 进展：
  - 已补齐组件级生命周期注册与触发：`onMounted`/`onUnmounted`/`onBeforeUpdate`/`onUpdated`。
  - `onMounted`/`onUpdated`/`onUnmounted` 走 scheduler 的 post flush；`onBeforeUpdate` 在 patch 前同步触发。
  - 卸载会标记已入队的 mounted/updated job 为 disposed，避免同 tick “先卸载后 mounted/updated”。
- 影响：
  - 组件无法在挂载完成后执行 DOM 操作（如 focus、测量尺寸）。
  - 清理副作用缺少明确时机（timer、订阅、外部库实例），容易遗漏。
  - 与 Vue 3 Composition API 不兼容，迁移成本高。

## 设计要点

### Hook 注册

- 在 `ComponentInstance` 上增加生命周期回调数组（按注册顺序执行）：
  - `mounted`：`onMounted`
  - `unmounted`：`onUnmounted`
  - `beforeUpdate`：`onBeforeUpdate`
  - `updated`：`onUpdated`
- `setup` 执行期间通过 `getCurrentInstance()` 注册钩子（参考 `provide/inject` 的严格时机约束）。

### Hook 触发时机与调度

- `onMounted`：首渲染完成并完成子树挂载后触发；建议通过 `queuePostFlushCb` 进入微任务队列，语义对齐 `nextTick()`。
- `onBeforeUpdate`：组件更新时，`patchLatestSubtree` 前同步触发（不入队，避免时序漂移）。
- `onUpdated`：组件更新 `patchLatestSubtree` 完成后触发；建议通过 `queuePostFlushCb` 入队，保证在 DOM 变更落地后执行。
- `onUnmounted`：组件卸载完成后触发；通过 `queuePostFlushCb` 入队（语义对齐 Vue3 `unmounted`）。

### 执行顺序（父子关系）

- 目标：mounted / unmounted / updated 均尽量满足「子 → 父」顺序（更符合真实 DOM/子树依赖场景）。
- 实现依赖：hook 入队顺序与挂载/卸载遍历顺序一致（子组件先完成挂载/卸载，因此先入队）。

### 错误处理

- Hook 触发必须被错误通道隔离：单个 hook 抛错不应中断同批次其它 hook/组件更新。
- hook 类型约束为同步函数；运行时不消费返回值（返回 Promise 会被忽略），不建议依赖异步 hook。

## Vue 3 关键保证点（基于 `vuejs/core`）

- **统一 post 队列**：`onMounted/onUpdated/onUnmounted` 通过 `queuePostRenderEffect` 进入 post flush（无 suspense 时退化为 `queuePostFlushCb`），保证在 DOM patch/unmount 完成后执行。参考：`/Users/jiangsheng/GitHub/core/packages/runtime-core/src/renderer.ts`、`/Users/jiangsheng/GitHub/core/packages/runtime-core/src/scheduler.ts`。
- **父子顺序：子 → 父**：
  - 这些 hook 在递归 patch/unmount 过程中被“按发生顺序”入队：子组件先完成 patch/unmount，因此会先入队。
  - `flushPostFlushCbs` 会对 post 队列去重并排序；生命周期 hook job 通常没有 `id`，`getId()` 结果一致（`Infinity`），因此稳定排序会保留入队顺序，从而保持「子 → 父」。
- **跳过已卸载组件的更新**：主更新队列按 `job.id（uid）` 升序插入，保证父组件先于子组件更新；父更新过程中若卸载子组件，会把子组件的 update job 标记为 `DISPOSED`，从而跳过子更新与其 `onUpdated`（避免“卸载后仍 updated”）。
- **过期 mounted 防护**：卸载组件时会对已注册但尚未 flush 的 mounted/activated 回调做 `invalidateMount(...).flags |= DISPOSED`，`flushPostFlushCbs` 会跳过 `DISPOSED` job，避免“同 tick 先卸载后 mounted”。
- **调用 hook 时设置 currentInstance**：`injectHook` 包装 hook 时会临时 `setCurrentInstance(target)`，并 `pauseTracking/resetTracking`，避免在 hook 内意外收集响应式依赖。参考：`/Users/jiangsheng/GitHub/core/packages/runtime-core/src/apiLifecycle.ts`。

## 决策与约束

- `onMounted` 等只能在组件 `setup()` 执行期间调用；在 `setup` 外调用直接抛错（与 `provide/inject` 保持一致）。
- hook 执行期间需要临时 `setCurrentInstance(instance)`：对齐 Vue 3 行为，并允许 hook 内部读取实例上下文；实现时需要同步调整 `getCurrentInstance()` 的注释/契约（不再仅限于 setup）。
- `onUnmounted` 走 `post` 队列：对齐 Vue 3 行为，确保 DOM/子树卸载完成后再执行清理逻辑。
- 需要过期防护：沿用 Vue 3 的 `SchedulerJobFlags.DISPOSED` 思路，组件卸载后跳过已入队但尚未执行的 `onMounted/onUpdated`（例如同 tick “先入队后卸载”）；实现形态对齐 Vue3：以“函数 job + 挂载 `flags/id` 元数据”为主（类似 `SchedulerJob`）。
- hook 抛错策略：都继续执行，其它组件/队列任务不受影响，错误通道统一上报。
- hook 类型为同步函数：运行时不消费返回值（返回 Promise 会被忽略），不建议依赖异步 hook。
- 需要递归更新保护：在 `scheduler` 层引入「同一 tick 内的递归更新计数与上限」，避免 `onBeforeUpdate` 等 hook 内同步写入响应式状态导致更新风暴或栈溢出；超限时走错误通道上报并跳过该 job（策略参考 Vue 3 的 `RECURSION_LIMIT`）。
- 首渲染失败（`performInitialRender` 触发 teardown）时不触发 `onMounted`。
- 更新渲染失败（`rerenderComponent` 回滚 `subTree`）时不触发 `onBeforeUpdate/onUpdated`。

## Action items

[x] 增补设计稿与实现清单：将本计划链接到 `docs/plans/next-features-plan.md` 的「## 3. 生命周期钩子」并补齐关键决策点。  
[x] 扩展 `ComponentInstance`：增加 hook 回调数组与必要状态位（例如 mounted/unmounted 标记），并在 `createComponentInstance` 初始化。  
[x] 新增 hook 注册模块（建议 `src/runtime-core/component/lifecycle.ts`）：实现 `onMounted/onUnmounted/onBeforeUpdate/onUpdated`，基于 `getCurrentInstance()` 注册到实例。  
[x] 扩展调度器：以「函数 job + `flags/id` 元数据」形式引入 flags（至少 `DISPOSED`/`QUEUED`），flush 时跳过 `DISPOSED`，并加入递归更新保护（同 tick 计数 + 上限 + 错误通道上报）。  
[x] 接入挂载时机：在 `performInitialRender` 挂载子树成功后触发 `onMounted`（建议 `queuePostFlushCb`）。  
[x] 接入更新时机：在 `rerenderComponent` 的 patch 前触发 `onBeforeUpdate`，patch 完成后触发 `onUpdated`（建议 `queuePostFlushCb`）。  
[x] 接入卸载时机：在 `teardownComponentInstance` 执行 `scope.stop`/清理子树后触发 `onUnmounted`（建议 `queuePostFlushCb`）。  
[x] 对外导出：按重导出约束仅通过 `src/runtime-core/component/index.ts`（如需）与 `src/runtime-core/index.ts`、`src/index.ts` 聚合导出 API。  
[x] 补充测试：覆盖 hook 触发次数、同 tick 合并时序、父子顺序、卸载与错误分支；至少新增 `test/runtime-core/component/lifecycle-hooks.test.tsx`。  
[x] 运行回归：`pnpm run test test/runtime-core/component/lifecycle-hooks.test.tsx`，并视变更范围补跑相关 runtime-core 用例。

## Vue 3 参考（用于对齐语义，不作为实现依赖）

- 注册入口：`packages/runtime-core/src/apiLifecycle.ts`（`createHook`/`injectHook`，并在调用 hook 时设置 `currentInstance`）。
- 实例存储：`packages/runtime-core/src/component.ts`（实例上以数组存储各类生命周期回调，如 `m`/`u`/`um` 等）。
- 调度入口：`packages/runtime-core/src/renderer.ts`（`queuePostRenderEffect` 通常会落到 `queuePostFlushCb`，用于 mounted/updated/unmounted 的 post 队列执行）。

## 已确认（原 Open questions）

- 需要区分「setup 期」与「hook 执行期」两类上下文：hook 执行期间会临时设置 `currentInstance`，并在 hook 期调用 setup-only API 时给出开发态警告（对齐 Vue3 的提示体验）。
- 过期防护沿用 Vue3 思路：通过扩展 scheduler job flags，引入 `SchedulerJobFlags.DISPOSED`；实现形态采用「函数 job + `flags/id` 元数据」，flush 阶段跳过已 `DISPOSED` 的 post hooks，避免同 tick “先卸载后 mounted/updated”。
- 递归更新保护在 scheduler 层实现：引入同 tick 递归计数与上限（策略参考 Vue 3 `RECURSION_LIMIT`），超限时走错误通道上报并跳过该 job。
