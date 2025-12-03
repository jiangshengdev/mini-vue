# Runtime Core 模块问题记录

## 1. Fragment 空挂载未清理组件实例（待修复）

- 位置：`src/runtime-core/renderer/mount-child.ts`
- 现状：数组 children 分支在收集完子项 teardown 后，若 `nodes.length === 0` 会直接返回 `undefined`，导致内部组件实例的 `teardownComponentInstance` 永远不会被调用。
- 影响：`Fragment` 或数组 children 内若包含返回空子树的组件（如条件渲染返回 `undefined`），在父级卸载或重渲染时响应式 `effect`、`watch` 与 scope 无法释放，形成内存泄漏。
- 提示：即便片段没有真实 DOM 节点，也需要保存并执行子项 teardown，确保组件作用域与副作用能够正确停止。

## 2. 组件首次渲染异常时 effect 泄漏（待修复）

- 位置：`src/runtime-core/renderer/mount-component.ts`
- 现状：`performInitialRender` 创建 `ReactiveEffect`、运行 `instance.render()` 并挂载子树的过程没有 `try...finally` 保护，一旦渲染函数或 `mountChild` 抛错，会直接退出，未返回 `MountedHandle` 也未调用 `teardownComponentInstance`。
- 影响：抛错组件的 effect 仍留在依赖桶里且 scope 维持激活状态，后续即使容器 `unmount` 也无法清理，导致响应式副作用不断运行且难以恢复。
- 提示：首次渲染流程需要保证在异常情况下也能停止 effect、清空 scope 与 teardown 子树，避免半初始化状态遗留。
