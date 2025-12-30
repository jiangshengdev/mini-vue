# 计划：生命周期钩子（Lifecycle Hooks）

实现组件级生命周期钩子 `onMounted` / `onUnmounted` / `onBeforeUpdate` / `onUpdated`，补齐 `runtime-core` 的组件模型能力，并与现有 scheduler（`pre`/`post` flush 队列、`nextTick`）对齐时序，尽量贴近 Vue 3 Composition API 的使用体验。

## Scope

- In: Hook 注册 API、实例存储结构、挂载/更新/卸载触发点接入、错误处理策略、测试与文档补齐。
- Out: Options API 生命周期、KeepAlive（activated/deactivated）、异步 setup、SSR/水合特化实现。

## 背景与现状

- 位置：`src/runtime-core/component/context.ts`、`src/runtime-core/component/instance.ts`
- 现状：
  - 仅有 `effectScope` 的 `onScopeDispose` 与实例级 `cleanupTasks`，缺少组件级生命周期钩子。
  - `render-effect.ts` 已预留 `onBeforeUpdate`/`onUpdated` 的占位注释，但未实现 hook 注册与触发。
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
- `onUnmounted`：组件卸载完成后触发；建议通过 `queuePostFlushCb` 入队（语义接近 Vue3 `unmounted`）。

### 执行顺序（父子关系）

- 目标：mounted / unmounted / updated 均尽量满足「子 → 父」顺序（更符合真实 DOM/子树依赖场景）。
- 实现依赖：hook 入队顺序与挂载/卸载遍历顺序一致（子组件先完成挂载/卸载，因此先入队）。

### 错误处理

- Hook 触发必须被错误通道隔离：单个 hook 抛错不应中断同批次其它 hook/组件更新。
- 需要明确是否允许 hook 返回 Promise（Vue3 允许，但本仓库 `runSilent` 默认拒绝 thenable runner），见 Open questions。

## 决策与约束

- `onMounted` 等只能在组件 `setup()` 执行期间调用；在 `setup` 外调用直接抛错（与 `provide/inject` 保持一致）。
- 首渲染失败（`performInitialRender` 触发 teardown）时不触发 `onMounted`。
- 更新渲染失败（`rerenderComponent` 回滚 `subTree`）时不触发 `onBeforeUpdate/onUpdated`。

## Action items

[ ] 增补设计稿与实现清单：将本计划链接到 `docs/plans/next-features-plan.md` 的「## 3. 生命周期钩子」并补齐关键决策点。  
[ ] 扩展 `ComponentInstance`：增加 hook 回调数组与必要状态位（例如 mounted/unmounted 标记），并在 `createComponentInstance` 初始化。  
[ ] 新增 hook 注册模块（建议 `src/runtime-core/component/lifecycle.ts`）：实现 `onMounted/onUnmounted/onBeforeUpdate/onUpdated`，基于 `getCurrentInstance()` 注册到实例。  
[ ] 接入挂载时机：在 `performInitialRender` 挂载子树成功后触发 `onMounted`（建议 `queuePostFlushCb`）。  
[ ] 接入更新时机：在 `rerenderComponent` 的 patch 前触发 `onBeforeUpdate`，patch 完成后触发 `onUpdated`（建议 `queuePostFlushCb`）。  
[ ] 接入卸载时机：在 `teardownComponentInstance` 执行 `scope.stop`/清理子树后触发 `onUnmounted`（建议 `queuePostFlushCb`）。  
[ ] 对外导出：按重导出约束仅通过 `src/runtime-core/component/index.ts`（如需）与 `src/runtime-core/index.ts`、`src/index.ts` 聚合导出 API。  
[ ] 补充测试：覆盖 hook 触发次数、同 tick 合并时序、父子顺序、卸载与错误分支；至少新增 `test/runtime-core/component/lifecycle-hooks.test.tsx`。  
[ ] 运行回归：`pnpm run test test/runtime-core/component/lifecycle-hooks.test.tsx`，并视变更范围补跑相关 runtime-core 用例。  

## Vue 3 参考（用于对齐语义，不作为实现依赖）

- 注册入口：`packages/runtime-core/src/apiLifecycle.ts`（`createHook`/`injectHook`，并在调用 hook 时设置 `currentInstance`）。
- 实例存储：`packages/runtime-core/src/component.ts`（实例上以数组存储各类生命周期回调，如 `m`/`u`/`um` 等）。
- 调度入口：`packages/runtime-core/src/renderer.ts`（`queuePostRenderEffect` 通常会落到 `queuePostFlushCb`，用于 mounted/updated/unmounted 的 post 队列执行）。

## Open questions

- Vue 3 官方实现中，`onMounted/onUpdated/onUnmounted` 的调度与执行顺序（尤其父子顺序）有哪些关键保证点？我们需要对齐到什么程度？
- hook 执行时是否需要临时 `setCurrentInstance(instance)`（对齐 Vue 3 行为，并可能让 `getCurrentInstance()` 在 hook 内可用）？若需要，是否要调整 `getCurrentInstance()` 的注释/契约？
- 是否允许 hook 返回 Promise（例如 `onMounted(async () => ...)`）？如果允许，需要新增「支持 Promise 的错误通道 runner」或在 hook 执行时对 Promise 做 `catch(dispatchError)`；如果不允许，需要明确错误提示与文档说明。
- `onUnmounted` 应该走 `post` 队列（更贴近 Vue3）还是同步执行（更利于立即释放资源）？如果走 `post`，是否需要“组件已卸载则跳过已入队的 mounted/updated”之类的过期防护？
- hook 抛错时的策略：是否继续执行同实例后续 hooks？是否继续执行其它组件/队列任务？（建议：都继续，错误通道统一上报）
