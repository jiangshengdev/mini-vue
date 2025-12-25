# 计划：异步调度器（Scheduler）

实现异步调度器，提供批量合并、去重和 `nextTick` 能力，使响应式更新和组件渲染更贴近 Vue 3，提升性能与一致性。

## Scope

- In: 设计/实现调度器、接入组件渲染与 `ReactiveEffect` 调度入口、提供 `nextTick`、补充测试与边界校验。
- Out: 生命周期钩子具体实现、VNode diff 进一步优化、Playground/文档更新（可后续处理）。

## Action items

[ ] 梳理现有 `ReactiveEffect` 调度入口与组件 render effect 调用链，明确接入点（如 `src/runtime-core/component/render-effect.ts`）。  
[ ] 设计微任务调度器：任务队列去重、flush 时序、错误处理与递归更新防护；确定微任务实现方式（`Promise`/`queueMicrotask`）。  
[ ] 实现 `nextTick(callback?)`，复用同一 flush，返回 Promise，覆盖 callback/await 用法。  
[ ] 将组件 render effect 的 scheduler 接入新调度器，确保同一 tick 多次触发只执行一次渲染，同时保持首渲染同步。  
[ ] 预留/插入 `onBeforeUpdate`/`onUpdated` 钩子执行时机（只留 TODO/占位，不实现钩子），防止调度栈溢出或无限循环。  
[ ] 补充测试：调度去重、嵌套触发、错误不破坏队列、`nextTick` 顺序、组件更新批量合并等。  
[ ] 评估边界风险：大批量任务、错误传播、SSR/无 DOM 环境兼容；无需宏任务降级（目标环境具备微任务）。  
[ ] 运行相关测试套件（至少 `pnpm run test`）验证无回归。

## 决策与约束

- 生命周期钩子本轮仅预留占位，不实现具体逻辑。
- 不暴露公共调度 API（如 `queueJob`），调度器内部使用。
- 目标环境具备微任务能力，暂不考虑宏任务降级与无 DOM/SSR 场景。
