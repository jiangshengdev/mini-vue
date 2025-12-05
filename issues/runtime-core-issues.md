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

## 3. 元素 ref 未回填 DOM（待修复）

- 位置：`src/runtime-core/renderer/mount-element.ts`
- 现状：函数内部只在 teardown 阶段调用 `assignElementRef(refBinding, undefined)`，但在元素创建并插入容器后没有对应的 `assignElementRef(refBinding, element)`。使用者在挂载完成前后读取 ref 始终得到 `undefined`。
- 影响：依赖 DOM 引用的组件（例如 focus、尺寸计算）完全失效，ref API 基本不可用。
- 提示：在 `appendChild` 之后立即回填元素引用，并保留原有卸载时清空 ref 的逻辑。

## 4. 组件重渲染会破坏兄弟顺序（待修复）

- 位置：`src/runtime-core/renderer/mount-component.ts`
- 现状：`rerenderComponent` 先运行 `teardownMountedSubtree` 把旧节点移除，再执行调度回调并通过 `mountChild` 重新挂载。`mountChild` 始终调用 `appendChild`，缺少锚点或占位记录，新子树因此被追加到容器末尾。
- 影响：若组件位于多个兄弟节点之间，每次响应式更新都会把组件 DOM 移到最后，破坏预期顺序，导致 UI 闪动甚至语义错误。
- 提示：需要在 teardown 前记录首个宿主节点并在重挂时作为插入锚点，或改成容器级 clear+整体挂载以保持节点位置。
