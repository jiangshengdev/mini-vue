# Plan（已完成）

对齐 Vue3 的组件锚点/句柄语义：组件 vnode 的 `handle.nodes` 必须与最新子树一致；当组件需要锚点保序时，`vnode.el` 应指向 `startAnchor`，`vnode.anchor` 指向 `endAnchor`。修复「隐藏 → 重排 → 再显示」导致的旧节点复活与重复渲染。

## Scope

- In: 组件 vnode `handle.nodes` 同步、组件锚点在 keyed 移动中的补齐、`vnode.el/anchor` 回写、相关测试与 Playground anchor 验证。
- Out: SSR/hydration、样式/UI、与锚点无关的功能。

## Action items

[x] 复现并对齐 Vue3 语义：确认组件 `vnode.el/anchor` 与 `handle.nodes` 在锚点场景下的预期指向。
[x] 设计并实现同步点：组件 patch/rerender 后同步 `vnodeHandle.nodes`，并回写 `vnode.el/anchor`。
[x] 加固 keyed 移动：组件在同级列表位置变化时同步 `shouldUseAnchor`，必要时补齐 `start/endAnchor`，再同步句柄。
[x] 补齐测试与验证：新增 `test/runtime-dom/render/component-anchor-regression.test.tsx`，并确保相关 keyed 用例通过；运行 `pnpm run test`。

## Decisions

- 空渲染占位：当组件需要锚点保序时保留 `startAnchor/endAnchor`（即便子树为空），不额外引入单注释占位。
- vnode 元数据：组件更新后必须保证 `handle.nodes`、`vnode.el`、`vnode.anchor` 对齐最新宿主节点集合，供 `children diff` 安全移动。
- 宿主范围：只考虑 DOM 渲染，无需适配其他宿主或 SSR。

## Findings（已验证）

- 根因：组件 `render` 变成 `undefined` 后，真实 DOM 会被卸载，但组件 vnode 的 `handle.nodes` 未同步为最新节点集合；随后父级 keyed 重排会按旧 `handle.nodes` 进行移动，从而把「已卸载的旧节点」重新插回 DOM，最终出现重复。
- 触发链路：子组件有稳定 `key` → 子组件渲染从「有节点」切到「空」→ 父级列表重排 → 子组件再次渲染出节点。
- 组件补锚点边界：组件从「末尾（无需锚点）」变为「非末尾（需要锚点）」时，若直接把 `start/endAnchor` append 到容器尾部，会导致 `vnode.el` 指向错误位置；后续在其前插入节点时会错序。
- `Fragment` 同类问题：`Fragment` 子树清空后若不刷新其 `handle.nodes`，父级 keyed 重排会移动到旧节点引用，导致已卸载的 DOM 被错误复活（与组件场景同根因）。

## Fix summary

- `src/runtime-core/component/anchor.ts`：新增 `syncComponentVirtualNodeHandleNodes`，同步 `vnodeHandle.nodes` 并回写 `vnode.el/anchor`。
- `src/runtime-core/component/anchor.ts`：`ensureComponentAnchors` 支持传入插入锚点；当组件已挂载且需要补锚点时，将 `startAnchor` 插到现有子树首节点之前，`endAnchor` 插到父级锚点之前（或容器尾部）。
- `src/runtime-core/patch/child.ts`：组件 patch 时更新 `shouldUseAnchor`，必要时 `ensureComponentAnchors(options, instance, environment.anchor)`，并同步句柄与元数据。
- `src/runtime-core/component/render-effect.ts`：组件 rerender 后调用同步，避免后续移动拿到旧节点引用。
- `src/runtime-core/mount/child.ts` / `src/runtime-core/patch/child.ts`：为带区间锚点的句柄标记内部标识，并在 `Fragment` patch 后同步 `handle.nodes`，避免旧节点复活。
- `test/runtime-dom/render/component-anchor-regression.test.tsx`：新增回归覆盖「隐藏 → 重排 → 再显示」。
- `test/runtime-dom/render/anchor-edge-cases.test.tsx`：新增边界用例覆盖「组件补锚点后再插入」与「Fragment 清空后重排」。

## Validation plan

- 目标测试：`test/runtime-dom/render/component-anchor-regression.test.tsx`、`test/runtime-dom/render/anchor-edge-cases.test.tsx`、`test/runtime-core/patch/children-keyed.test.tsx`（含组件移动用例）、`pnpm run test`。
- Playground 手动：`playground/views/anchor` 反复隐藏/显示、打乱顺序，观察列表项是否重复。
