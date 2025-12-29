# Plan（已完成）

修复「隐藏子组件内容 → 打乱列表 → 再显示」导致的重复元素：根因是 vnode 的 `handle.nodes` 在更新后未同步，父级 keyed 重排会移动到已卸载的旧 DOM（被错误复活）。同类问题也会出现在组件“补锚点”与 `Fragment` 子树清空场景。

## Scope

- In: 组件 vnode `handle.nodes`/`el`/`anchor` 同步；组件在 keyed 移动后 `shouldUseAnchor` 变化时的锚点补齐；相关回归测试。
- Out: SSR/hydration、样式/UI、与锚点无关的 diff 优化。

## Action items

[x] 复现并定位：确认重复来自「移动旧节点引用」而非 `findNextAnchor` 取锚。
[x] 修复组件 vnode 句柄同步：rerender 后刷新 `vnode.handle.nodes`，并回写 `vnode.el/anchor`。
[x] 修复 keyed 移动场景：组件 patch 时同步 `shouldUseAnchor`，必要时创建锚点，再同步句柄。
[x] 补回归测试：`test/runtime-dom/render/component-anchor-regression.test.tsx`。
[x] 验证：运行 `pnpm run test` 通过。

## Notes / Decisions

- 问题核心是「句柄节点集合」失真：`children diff` 的移动逻辑依赖 `handle.nodes`，必须与最新子树保持一致。
- 锚点本身不是根因，但 `shouldUseAnchor` 在 keyed 重排中会变化，需要在组件 patch 时及时补齐锚点，避免移动阶段缺锚/错锚。
- 组件从「末尾（无需锚点）」变为「非末尾（需要锚点）」时，锚点必须插在现有子树前后（而不是简单 append），否则后续插入/重排会以错误位置作为锚。
- `Fragment` 子树从「有节点」变为「空」后也需要同步 `handle.nodes`；同时让 `Fragment` 始终带首尾锚点（含 0/1 子节点）能避免边界推断，整体更接近 Vue3。
