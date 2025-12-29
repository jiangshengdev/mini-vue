# Plan

将 `runtime-core` 的锚点/移动逻辑重构为更接近 Vue 3：用 `vnode.el/anchor` 表达宿主区间，靠 `getNextHostNode` 计算插入锚点，并以 `move(vnode)` 统一移动，尽量消除对 `shouldUseAnchor` 与“必须同步 `handle.nodes`”的依赖。

## Scope

- In: `runtime-core` 的 normalize/mount/patch（含组件更新、children diff、移动/锚点工具）、`jsx-foundation` 的 vnode 类型扩展、`runtime-dom` 与测试宿主的 renderer options 适配、相关回归测试补齐。
- Out: SSR/hydration、Teleport/Suspense/Transition 等高级特性、与锚点无关的 diff 性能优化。

## Action items

[x] 明确目标不变量并对齐现状：整理 Vue3 的 `el/anchor + Comment 占位 + getNextHostNode + move(vnode)` 数据流，并标注当前实现中与之冲突/冗余的点（`shouldUseAnchor`、组件锚点、`handle.nodes` 同步点）。
[x] 扩展宿主接口以支持“按区间遍历/移动”：在 `src/runtime-core/renderer.ts` 的 `RendererOptions` 增加 `nextSibling(node)`（必要时再加 `parentNode(node)`），同步更新 `src/runtime-dom/renderer-options.ts` 与 `test/runtime-core/host-utils.ts`。
[x] 引入 `Comment` VNode（对齐 Vue3 的空渲染占位）：在 `src/jsx-foundation/constants.ts`/`factory.ts`/`types.ts` 增加 `Comment` 标识与 `createCommentVirtualNode`，并从 `src/jsx-foundation/index.ts` 导出。
[x] 调整 normalize 策略区分“根卸载”与“内部空渲染”：normalize 层对所有 `null/boolean` 子节点都生成 `Comment` vnode（完全对齐 Vue3），但根级 `render(undefined)` 仍保持卸载语义（可通过 `src/runtime-core/renderer.ts` 先判空再 normalize，或拆分 `normalizeVNode`/`normalizeRoot` 两套入口于 `src/runtime-core/normalize.ts`）。
[x] 让 mount 路径真正“在最终位置插入”：给 `mountVirtualNode`/`mountElement`/`mountComponent` 增加 `anchor` 透传，删除 `src/runtime-core/mount/child.ts` 里“先 mount 再整体 move 到父 anchor”的补偿逻辑。
[x] 实现 Vue3 风格的宿主范围辅助：新增/重写 `getFirstHostNode`/`getLastHostNode`/`getNextHostNode`（Fragment 用 `anchor`，Component 递归到 `instance.subTree`，其余用 `el` + `nextSibling`），集中放在 `src/runtime-core/patch/utils.ts`（或新文件）。
[x] 实现统一的 `move(vnode, container, anchor)`：Element/Text/Comment 移动单节点；Fragment 用 `nextSibling` 遍历 `[start..end]`；Component 递归 move `instance.subTree`，并更新相应运行时元数据一致性。
[x] 改造组件更新锚点来源：在 `src/runtime-core/component/render-effect.ts` 的更新分支中，用 `getNextHostNode(previousSubTree)` 作为 `patchChild(..., anchor)` 的插入锚点，逐步去除对 `instance.endAnchor` 的依赖。
[ ] 改造 keyed/unkeyed children diff 的移动实现：把 `src/runtime-core/patch/keyed-children.ts`/`driver.ts` 从 “move nodes array（依赖 `handle.nodes`）” 切到 “move vnode（依赖 `el/anchor + nextSibling`）”；相应地让 `findNextAnchor` 优先基于 `vnode.el`（而不是 `handle.nodes[0]`）。
[ ] 清理旧锚点体系并验证：在新路径通过后，删除/收敛 `shouldUseAnchor`、`ensureComponentAnchors`、`mountComponentSubtreeWithAnchors` 及相关实例字段；跑 `pnpm run test`，重点回归 `test/runtime-dom/render/component-anchor-regression.test.tsx`、`test/runtime-dom/render/anchor-edge-cases.test.tsx`、`test/runtime-core/patch/children-keyed.test.tsx`，补齐“空渲染占位 + keyed 重排 + 再显示”的边界用例。

## Decisions

- 允许进行任何 breaking change（包括扩展 `RendererOptions` 的宿主契约）。
- 接受“空渲染产生 Comment 节点”，并以贴近 Vue3 作为正确方向。
- normalize 层对所有 `null/boolean` 子节点都生成 `Comment`（完全对齐 Vue3），并通过“根级判空/拆分入口”保留 `render(undefined)` 的卸载语义。

## Step 1 输出：目标不变量与现状对齐

### 术语对齐（避免 anchor 混用）

- 插入锚点（insertion anchor）：本轮新节点应插到哪个宿主节点之前；对应当前实现的 `environment.anchor`。
- 区间尾锚点（range end / end anchor）：表示某个 vnode 占用区间的结束边界；对应 Vue3 的 `vnode.anchor`，当前实现也叫 `runtime.anchor`（Fragment）或 `instance.endAnchor`（组件）。

> 结论：后续重构时尽量把变量命名拆成 `insertionAnchor` 与 `rangeEnd`，否则非常难读。

### Vue3 参考：关键不变量（简化版）

1. **VNode 一定能映射到稳定的宿主范围**
   - 单节点类型（Element/Text/Comment）：只需 `vnode.el`。
   - 多节点类型（Fragment）：`vnode.el = startAnchor`，`vnode.anchor = endAnchor`（首尾注释边界，始终存在）。
   - 组件：组件 vnode 的 `el/anchor` 来源于其 `subTree`（组件自身不额外发明“外层锚点”作为边界）。
2. **空渲染不会导致“0 个宿主节点”**
   - `null/boolean` 会被归一化为一个 `Comment` vnode（占位节点），保证父级 diff/move 永远有可用锚点/可移动实体。
3. **mount/patch 的插入位置完全由“插入锚点”决定**
   - 所有节点创建/移动都以 `container + insertionAnchor` 为准，不依赖“我是不是最后一个兄弟”的布尔推断。
4. **移动以 `move(vnode)` 为中心，而非“提前收集节点数组”**
   - Element/Text/Comment：移动单节点 `el`。
   - Fragment：用 `hostNextSibling` 遍历 `[start..end]` 并整体搬移。
   - Component：递归移动 `instance.subTree`。

### Vue3 参考：数据流（对齐本项目抽象）

- normalize：`RenderOutput` → `NormalizedVNode`
  - 数组 → `Fragment`
  - `string/number` → `Text`
  - `null/boolean` → `Comment`（占位）
  - 根级 `render(undefined)` 作为“卸载”单独处理（不走占位）
- mount：`patch(null, vnode, container, insertionAnchor)`
  - Fragment：创建 `start/end` 注释边界并把 children 挂在两者之间
  - Component：渲染得到 `subTree`，对 `subTree` 做 patch；组件 vnode 的 `el/anchor` 回写自 `subTree`
  - Element/Text/Comment：创建节点并 `insertBefore(container, node, insertionAnchor)`
- update：`patch(prev, next, container, insertionAnchor)`
  - Component update：`patch(prevSubTree, nextSubTree, container, getNextHostNode(prevSubTree))`，再回写组件 vnode 宿主引用
- children diff：
  - 插入锚点来自“后继兄弟的首宿主节点”（`getNextHostNode`），找不到则回退到父级 `insertionAnchor`
  - 移动直接 `move(vnode, container, anchor)`，不需要依赖 `handle.nodes` 的快照

### mini-vue 现状：对应点（已存在/缺失）

- 已存在：Fragment/数组在 mount 时总是生成首尾注释边界，见 `src/runtime-core/mount/child.ts` 的 `mountArrayChild(...)`。
- 已存在：`vnode.el/anchor/handle/component` 以 `RuntimeVirtualNode` 形态维护，见 `src/runtime-core/virtual-node.ts` 与各 mount/patch 分支。
- 已解决：normalize 对 `null/boolean` 归一为 `Comment`（空渲染占位），同时保留根级 `render(undefined)` 的卸载语义，见 `src/runtime-core/normalize.ts` + `src/runtime-core/renderer.ts`。
- 差异：当前插入锚点主要依赖 `findNextAnchor(...)` → `getFirstHostNode(...)` → `vnode.el/anchor`（组件仍兼容旧的 start/endAnchor），仍未切到「基于宿主 `nextSibling` 的区间遍历」，见 `src/runtime-core/patch/utils.ts`。
- 差异：keyed 移动是“搬移 `handle.nodes` 数组”，见 `src/runtime-core/patch/keyed-children.ts` + `src/runtime-core/patch/driver.ts`。

### 当前实现的冲突/冗余点（相对 Vue3 目标）

1. `shouldUseAnchor`（`src/runtime-core/environment.ts`）属于“位置推断型开关”
   - 它驱动了组件是否需要额外锚点、以及 mount/patch 的部分分支。
   - 在 Vue3 方向里，应由“每次 mount/patch 都带 insertionAnchor”替代该布尔开关；否则组件在 keyed 重排中会反复补锚点、同步句柄，复杂度爆炸。
2. 组件锚点（`instance.startAnchor/endAnchor` + `ensureComponentAnchors`）
   - 这是为解决“组件在非末尾时需要稳定边界 + 空渲染可能 0 节点 + mount 不支持 insertionAnchor”而引入的补丁系统。
   - Vue3 方向：组件 vnode 的范围来自 `subTree`（空渲染是 Comment，Fragment 自带边界），因此组件不需要独立的“外层锚点体系”。
3. `handle.nodes` 的同步点过多且语义脆弱
   - Fragment patch 后必须重建 `handle.nodes`，否则 keyed move 会把旧节点引用插回 DOM（“复活旧节点”），见 `src/runtime-core/patch/child.ts` 的 Fragment 分支。
   - 组件 rerender/patch 后必须同步 `instance.vnodeHandle.nodes`，见 `src/runtime-core/component/render-effect.ts` 与 `src/runtime-core/component/anchor.ts`。
   - Vue3 方向：移动应基于 `vnode.el/anchor + hostNextSibling` 的“真实区间”，从根上消除“移动依赖快照数组”带来的同步负担。
4. mount 后再 move（已解决）
   - 已让 `mountVirtualNode`/`mountElement`/`mountComponent` 透传 `anchor` 并在最终位置插入，删除了 `mountChild` 的二次移动补偿逻辑。
   - 后续仍需把移动与插入锚点统一收敛到 Vue3 的 `getNextHostNode + move(vnode)`，才能进一步删掉 `shouldUseAnchor` 与 `handle.nodes` 同步点。
