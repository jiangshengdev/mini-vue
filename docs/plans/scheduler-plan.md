# 计划：异步调度器（Scheduler）

实现异步调度器，提供批量合并、去重和 `nextTick` 能力，使响应式更新和组件渲染更贴近 Vue 3，提升性能与一致性。

## Scope

- In: 设计/实现调度器、接入组件渲染与 `ReactiveEffect` 调度入口、提供 `nextTick`、补充测试与边界校验。
- Out: 生命周期钩子具体实现、VNode diff 进一步优化、Playground/文档更新（可后续处理）。

## Action items

[x] 梳理现有 `ReactiveEffect` 调度入口与组件 render effect 调用链，明确接入点（如 `src/runtime-core/component/render-effect.ts`）。  
[x] 设计微任务调度器：任务队列去重、flush 时序、错误处理与递归更新防护；确定微任务实现方式（`Promise`/`queueMicrotask`）。  
[x] 实现 `nextTick(callback?)`，复用同一 flush，返回 Promise，覆盖 callback/await 用法。  
[x] 将组件 render effect 的 scheduler 接入新调度器，确保同一 tick 多次触发只执行一次渲染，同时保持首渲染同步。  
[x] 为生命周期钩子提供调度基础：`onBeforeUpdate` 在 patch 前同步触发，`onUpdated` 进入 post flush；并依赖递归更新保护避免更新风暴。  
[x] 补充测试：调度去重、嵌套触发、错误不破坏队列、`nextTick` 顺序、组件更新批量合并等。  
[x] 评估边界风险：大批量任务、错误传播、SSR/无 DOM 环境兼容；无需宏任务降级（目标环境具备微任务）。  
[x] 运行相关测试套件（至少 `pnpm run test`）验证无回归。

风险评估结论：

- 大批量任务：队列使用数组 + Set 去重，单轮按插入序遍历；若持续入队会延长单个微任务执行时间，但不会丢任务。
- 错误传播：`runSilent` 统一上报且不中断后续 job，同一 tick 内重复错误仅首个触发处理器，符合 dedupe 设计。
- 兼容性：依赖微任务能力（`Promise.resolve()`），不涉及 DOM API，对 SSR/无 DOM 环境无额外假设；未做宏任务降级按目标环境约束。

## 决策与约束

- 生命周期钩子具体实现见 `docs/plans/lifecycle-hooks-plan.md`；本计划仅关注 scheduler 的队列/去重/过期与递归更新防护等基础设施。
- 不暴露公共调度 API（如 `queueJob`），调度器内部使用。
- 目标环境具备微任务能力，暂不考虑宏任务降级与无 DOM/SSR 场景。
