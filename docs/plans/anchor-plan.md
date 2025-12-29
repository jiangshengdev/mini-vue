# Plan

修复组件/Fragment 锚点在 render 为空后重排再显示时的错位/重复问题，对齐 Vue3：保持/重建占位锚点，正确回退锚点，确保插入位置稳定。

## Scope

- In: 组件/Fragment 锚点的创建、回退、保留逻辑；render 为空后的再挂载行为；相关测试与验证。
- Out: 与锚点无关的渲染特性、样式/UI 改动、其他优化。

## Action items

[x] 梳理锚点生命周期与调用点（mountComponentSubtreeWithAnchors、patchLatestSubtree、findNextAnchor 等），确认何时创建/清理/回退。
[x] 设计并实现锚点回退：rerender/patch 时优先使用 endAnchor，缺失时回退父级 anchor，插入统一用 insertBefore。
[x] 处理 render 为空的占位策略：shouldUseAnchor 为真时保留或重建注释锚点，避免下一轮 append 到尾部。
[x] 对齐 Fragment/数组路径：检查空 children/移动场景下的锚点保留与回退，保持策略一致。
[x] 补充回归测试：覆盖“隐藏组件 → 打乱顺序 → 再显示”以及有锚/无锚、Fragment 场景，验证无错位/重复。
[x] 验证改动：运行 `pnpm vitest test/runtime-core/component/anchor-regression.test.tsx`、`pnpm tsc --noEmit`，相关用例通过。

## Notes / Decisions

- SSR/hydration 暂不支持，注释文本一致性无需考虑。
- 依赖 `handle.nodes[0]` 取锚仅 `findNextAnchor`（通过 `getFirstHostNode`）。
- 隐藏状态的注释文本需保留（含 DEV 标签），用以保持位置稳定。
