# Runtime Core 模块问题记录

## 1. Fragment 空挂载未清理组件实例（已修复）

- 位置：`src/runtime-core/renderer/mount-child.ts`
- 修复：数组分支即便无宿主节点也返回 teardown 句柄，子组件实例的清理得以执行。

## 2. 组件首次渲染异常时 effect 泄漏（已修复）

- 位置：`src/runtime-core/renderer/mount-component.ts`
- 修复：`performInitialRender` 通过 `runWithErrorChannel` 捕获异常并在 `afterRun` 中 teardown 组件实例，防止 effect/scope 泄漏。

## 3. 元素 ref 未回填 DOM（已修复）

- 位置：`src/runtime-core/renderer/mount-element.ts`
- 修复：挂载后立即回填元素 ref，卸载时清空；`patch-props` 不再重复写 ref，避免多次触发。

## 4. 组件重渲染会破坏兄弟顺序（已修复）

- 位置：`src/runtime-core/renderer/mount-component.ts`
- 修复：引入组件级锚点与 `insertBefore`，重渲染时使用锚点片段插入保持兄弟顺序，卸载时移除锚点。

## 5. Fragment 共享 DocumentFragment 导致兄弟被误移除（待修复）

- 位置：`runtime-core/renderer` 的 Fragment/数组挂载与组件锚点处理。
- 现状：数组/Fragment 子节点挂载到同一个 `DocumentFragment`。当某个子组件渲染或更新阶段抛错并触发 teardown，会移除 fragment 内的锚点节点，导致同一 fragment 中的兄弟节点一起丢失。
- 影响：Fragment 根下的兄弟组件在前一个子组件失败后无法继续渲染或更新（测试用例需额外包一层父元素才稳定）。
- 方向：对齐 Vue 3 的“双锚点 + 父容器”策略：为 Fragment 创建 start/end 锚点并直接插入父容器，子节点插入锚点范围内；组件锚点也应以父容器为基准，避免共享 `DocumentFragment`。teardown 时按锚点范围清理，兄弟节点不再受影响。
