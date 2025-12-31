# 组件响应式问题记录

## 1. 渲染仍是全量卸载重建且无调度（已解决）

- 位置：`src/runtime-core/renderer.ts`、`src/runtime-core/component/render-effect.ts`、`src/runtime-core/mount/index.ts`
- 现状（修复前）：组件 effect 触发时会先 teardown 上次子树并清空容器，再重新 `mountChild`；scheduler 同步执行，缺少批量或微任务合并。
- 影响：同一帧多次状态更新会频繁卸载重建，DOM 抖动导致焦点与事件状态丢失，复杂子树的性能开销明显。
- 解决：
  - 组件更新改为 `patchChild(previousSubTree, nextSubTree)` 增量更新子树，复用 DOM 与子组件实例。
  - 引入异步 scheduler，合并同一 tick 内的重复更新，并提供 `nextTick()`。
- 关联：`docs/plans/vnode-diff-plan.md`、`docs/plans/scheduler-plan.md`

## 2. 缺少对非闭包组件的兼容层（待设计）

- 位置：`src/runtime-core/component/setup.ts`
- 现状：setup 未返回渲染闭包会直接抛出「组件必须返回渲染函数以托管本地状态」，缺少对返回 VirtualNode/JSX 组件的软性兜底。
- 影响：迁移旧版或第三方组件成本高，开发者无法在 Dev 环境获得渐进式升级指引。
- 建议：仅在 Dev 模式下自动将返回的 VirtualNode 包裹为闭包并输出 warning，提供迁移提示；Prod 维持严格校验以避免行为差异。

## 3. 实例上下文尚未承载生命周期/依赖注入（已解决）

- 位置：`src/runtime-core/component/context.ts`、`src/runtime-core/component/instance.ts`
- 现状（修复前）：`setCurrentInstance`/`getCurrentInstance` 仅用于渲染 effect 构造，缺少组件级生命周期注册与触发机制。
- 解决：
  - 已补齐组件生命周期 API：`onMounted`/`onUnmounted`/`onBeforeUpdate`/`onUpdated`，并与 scheduler flush 队列对齐。
  - `provide/inject` 维持 setup-only 约束，hook 执行期通过 scope 区分避免误用。
- 关联：`docs/plans/lifecycle-hooks-plan.md`
