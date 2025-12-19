# 组件响应式问题记录

## 1. 渲染仍是全量卸载重建且无调度（待优化）

- 位置：`src/runtime-core/renderer.ts`、`src/runtime-core/component/render-effect.ts`、`src/runtime-core/mount/index.ts`
- 现状：组件 effect 触发时会先 teardown 上次子树并清空容器，再重新 `mountChild`；scheduler 同步执行，缺少批量或微任务合并。
- 影响：同一帧多次状态更新会频繁卸载重建，DOM 抖动导致焦点与事件状态丢失，复杂子树的性能开销明显。
- 建议：
  - 在组件 rerender 时引入最小化 patch 流程，利用已有 Fragment/组件锚点限定增量更新范围，避免全量清空。
  - 增加简单调度器（微任务批量刷新或队列去重），合并同一轮更新请求。

## 2. 缺少对非闭包组件的兼容层（待设计）

- 位置：`src/runtime-core/component/setup.ts`
- 现状：setup 未返回渲染闭包会直接抛出「组件必须返回渲染函数以托管本地状态」，缺少对返回 VNode/JSX 组件的软性兜底。
- 影响：迁移旧版或第三方组件成本高，开发者无法在 Dev 环境获得渐进式升级指引。
- 建议：仅在 Dev 模式下自动将返回的 VNode 包裹为闭包并输出 warning，提供迁移提示；Prod 维持严格校验以避免行为差异。

## 3. 实例上下文尚未承载生命周期/依赖注入（待规划）

- 位置：`src/runtime-core/component/context.ts`、`src/runtime-core/component/instance.ts`
- 现状：`setCurrentInstance`/`getCurrentInstance` 仅用于渲染 effect 构造，没有暴露 `onMounted` 等生命周期注册或 provide/inject 管道，`setupState` 也未被这些能力消费。
- 影响：组件内部本地 state 无法与潜在的组合式 API 配合，未来扩展生命周期或依赖注入时缺少统一的注册与清理通路。
- 建议：设计实例级 Hook 注册与清理框架，让生命周期与依赖注入可以读取 `setupState`，并在 teardown 中统一释放。
