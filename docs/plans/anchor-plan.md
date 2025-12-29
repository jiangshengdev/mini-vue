# Plan

修复组件/Fragment 锚点在 render 为空后重排再显示时的错位/重复问题，对齐 Vue3：保持/重建占位锚点，正确回退锚点，确保插入位置稳定。当前实现仍存在「组件移动后注释锚点未随子树移动、handle 不含首尾锚」等问题，需要重新梳理。

## Scope

- In: 组件/Fragment 锚点的创建、回退、保留逻辑；render 为空后的再挂载行为；相关测试与验证。
- Out: 与锚点无关的渲染特性、样式/UI 改动、其他优化。

## Action items（更新后）

[ ] 对齐 Vue3 的锚点设计：组件不自创锚，组件 vnode 的 `el/anchor` 透传子树首/尾节点；空渲染时使用单注释占位（`el === anchor`）。
[ ] 统一组件 handle：`mountedHandle.nodes` 必须包含首尾锚（或占位注释），移动/卸载基于同一序列，杜绝锚点滞留。
[ ] 收敛锚点来源：优先 `endAnchor`，缺失时回退父级 `anchor`，避免 `latestHostAnchor` 与本地锚分裂；同步移动后及时刷新实例锚点。
[ ] 简化锚点保留/回收路径：集中到少数入口（mount/patch/teardown），删除冗余分支，保证子树为空/再挂载时锚点可重用。
[ ] 补充回归测试：组件隐藏→再显示→列表重排，验证注释锚包裹区间连续；覆盖空渲染占位、Fragment/多节点、移动后 rerender 再移动等路径。
[ ] 验证改动：`pnpm vitest test/runtime-core/component/anchor-regression.test.tsx test/runtime-core/patch/children-keyed.test.tsx`、`pnpm tsc --noEmit`。

## Findings / Notes

- 组件 rerender 后移动时，现有 `mountedHandle` 只含子节点，不含首尾锚，导致注释节点留在旧位置，浏览器调试视图显示组件未被注释包裹。
- 锚点创建/回退逻辑分散在 `mountComponentSubtreeWithAnchors`、`patchLatestSubtree`、`createComponentAnchorPlaceholder` 等多个路径，缺少统一约束，维护成本高。
- Vue3 设计：组件复用子树的 `el/anchor`，Fragment 用注释标记区间，移动时整体搬移 start→end；空渲染用单注释占位。需按此收敛策略。
- SSR/hydration 暂不支持，注释文本一致性无需考虑；隐藏状态下的注释需保留（含 DEV 标签），用以保持位置稳定。
