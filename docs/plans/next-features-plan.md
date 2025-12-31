# 下一阶段功能规划

> 本文为滚动计划：已落地项会移动到「已完成」以保留决策与上下文。

## 已完成（上一轮）

### 1. VirtualNode Diff / Patch

[x] 组件更新改为 `patchChild`，支持 keyed/unkeyed diff 与 LIS 优化，避免全量卸载重挂。

- 关键位置：`src/runtime-core/component/render-effect.ts`、`src/runtime-core/patch/**`
- 设计稿：`docs/plans/vnode-diff-plan.md`

### 2. 异步调度器 Scheduler

[x] 引入微任务调度队列与 `nextTick(callback?)`，合并同一 tick 内的重复更新并提供 flush 生命周期。

- 关键位置：`src/runtime-core/scheduler.ts`
- 设计稿：`docs/plans/scheduler-plan.md`

### 3. 生命周期钩子

[x] 补齐组件级生命周期注册与触发：`onMounted`/`onUnmounted`/`onBeforeUpdate`/`onUpdated`。

- 关键位置：`src/runtime-core/component/lifecycle.ts`
- 设计稿：`docs/plans/lifecycle-hooks-plan.md`

## 下一阶段（不含编译器）

### 1. DOM 渲染器 SVG 完整支持（优先级：高）

- 目标：在 `<svg>` 子树中正确创建/更新 SVG 元素，并避免 `className` 写入导致的异常。
- 位置：
  - `src/runtime-dom/renderer-options.ts`（`createElement` 需要处理 namespace）
  - `src/runtime-dom/props/class.ts`（SVG 元素写入 `class` 应走 `setAttribute`）
  - `src/runtime-dom/props/attr.ts`（如需支持 `xlink:href` 等带 namespace 的属性）
- 参考：`docs/issues/runtime-dom-issues.md`

### 2. runtime-dom 在无 DOM/SSR 环境可安全 import（优先级：高）

- 目标：在没有 `document` 的环境中仅 import `runtime-dom` 不应崩溃；需要给出明确错误或延迟到 `mount` 才访问 DOM。
- 位置：`src/runtime-dom/create-app.ts`
- 参考：`docs/issues/runtime-dom-issues.md`

### 3. 组件 setup 上下文（emit/attrs/slots/expose）（优先级：中）

- 现状：`SetupComponent` 仅接收 `props`，缺少 `setup(props, ctx)` 的扩展点，无法提供 `emit`/`slots` 等能力。
- 目标：定义最小 `SetupContext` 并在 `runtime-core` 落地（类型与运行时同步演进）。
- 可能涉及：
  - `src/jsx-foundation/types.ts`（组件类型签名）
  - `src/runtime-core/component/setup.ts`（调用约定与上下文注入）

### 4. JSX v-model 写回策略（优先级：中）

- 现状：仅支持 Ref；非 Ref 绑定目标只在开发期警告但不会写回，容易造成“UI 与数据不同步”的隐性问题。
- 目标：明确并固化策略：要么在类型/运行时层面强制“仅支持 Ref”，要么引入安全的可写目标协议（如 setter）。
- 参考：`docs/issues/jsx-runtime-issues.md`

### 5. children 类型与运行时对齐（优先级：低）

- 现状：运行时接受 `null` 并视为可忽略节点，但类型层面不允许（项目内部约定不使用 `null`）。
- 目标：在类型层兼容常见外部写法，同时保持仓库内部统一使用 `undefined` 表示“空/缺省”。
- 参考：`docs/issues/jsx-foundation-issues.md`

### 6. 测试容器清理策略（优先级：低）

- 现状：`cleanupTestContainers()` 会清空整个 `document.body`，潜在误删非本用例创建的 fixture。
- 目标：只清理由测试创建的容器节点，避免全局副作用。
- 参考：`docs/issues/top-level-issues.md`

## 实施顺序建议（不含编译器）

1. **SVG 支持** → 补齐 DOM 宿主能力缺口，避免“渲染成功但不显示/直接报错”的陷阱
2. **SSR/无 DOM import 安全** → 解耦模块加载与运行时依赖，提升可复用性
3. **setup ctx** → 完善组件模型的扩展点，为后续能力（如 slots/emit）铺路
4. **JSX v-model 策略** → 降低误用成本，提升一致性
5. **children 类型对齐** → 提升外部使用体验（迁移/学习成本）
6. **测试清理优化** → 降低未来用例维护风险
