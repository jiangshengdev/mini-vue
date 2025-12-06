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

## 5. Fragment 共享 DocumentFragment 导致兄弟被误移除（已修复）

- 位置：`runtime-core/renderer/mount-child.ts`。
- 修复：数组/Fragment 多子节点改用父容器内的 start/end 锚点包裹，空数组直接跳过、单子节点复用原逻辑，彻底避免共享 `DocumentFragment` 导致的兄弟误移除。新增 Fragment 回归用例覆盖子组件抛错后兄弟仍可更新的场景。
