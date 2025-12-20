# 下一阶段功能规划

## 1. VirtualNode Diff / Patch（优先级：高）

- 位置：`src/runtime-core/component/render-effect.ts`、`src/runtime-core/mount/`
- 现状：`rerenderComponent` 每次更新执行 `teardownMountedSubtree → mountLatestSubtree` 全量重建，无任何节点复用逻辑。
- 影响：
  - 列表渲染 N 项，改动 1 项需销毁重建 N 个 DOM 节点，性能随 UI 复杂度线性下降。
  - 丢失 DOM 状态（input focus、scroll position、CSS 动画中间态）。
  - 无法支持 `key` 属性优化列表项复用。
- 决策：采用「Vue 3 风格」的 keyed children diff（头尾同步 fast path + key map，中间区间按需移动；LIS 作为可选优化），而不是把「纯双端 diff」当作完整方案。
- 详细设计稿：见 docs/issues/virtualNode-diff-plan.md

## 2. 异步调度器 Scheduler（优先级：高）

- 位置：`src/runtime-core/component/render-effect.ts`、新增 `src/runtime-core/scheduler.ts`
- 现状：响应式触发同步执行，每次 `ref.value = x` 立即触发组件重渲染。
- 影响：
  - 同一事件回调内多次修改状态会触发多次渲染，浪费性能。
  - 无法提供 `nextTick()` API，开发者难以在 DOM 更新后执行逻辑。
  - 与 Vue 3 行为不一致，迁移成本高。
- 建议：
  - 实现微任务队列，收集同一 tick 内的更新任务并去重。
  - 暴露 `nextTick(callback?)` API，返回 Promise。
  - 组件 render effect 的 scheduler 改为入队而非同步执行。

## 3. 生命周期钩子（优先级：中）

- 位置：`src/runtime-core/component/context.ts`、`src/runtime-core/component/instance.ts`
- 现状：仅有 `effectScope` 的 `onScopeDispose`，缺少组件级生命周期。
- 缺失 API：`onMounted`、`onUnmounted`、`onBeforeUpdate`、`onUpdated`。
- 影响：
  - 组件无法在挂载完成后执行 DOM 操作（如 focus、测量尺寸）。
  - 清理副作用缺少明确时机，容易遗漏。
  - 与 Vue 3 Composition API 不兼容。
- 建议：
  - 在 `ComponentInstance` 上增加生命周期回调数组。
  - `setup` 执行期间通过 `getCurrentInstance()` 注册钩子。
  - 在 `performInitialRender` 完成后触发 `onMounted`，在 `teardownComponentInstance` 时触发 `onUnmounted`。

## 实施顺序建议

1. **Diff/Patch** → 解决最大性能瓶颈，使项目达到"可用"级别
2. **Scheduler** → 与 Diff 配合，避免批量更新时的重复 patch
3. **生命周期** → 在前两者稳定后补充，完善组件模型
