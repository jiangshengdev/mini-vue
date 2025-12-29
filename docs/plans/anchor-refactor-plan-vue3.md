# Plan

将 `runtime-core` 的锚点/移动逻辑重构为更接近 Vue 3：用 `vnode.el/anchor` 表达宿主区间，靠 `getNextHostNode` 计算插入锚点，并以 `move(vnode)` 统一移动，尽量消除对 `shouldUseAnchor` 与“必须同步 `handle.nodes`”的依赖。

## Scope

- In: `runtime-core` 的 normalize/mount/patch（含组件更新、children diff、移动/锚点工具）、`jsx-foundation` 的 vnode 类型扩展、`runtime-dom` 与测试宿主的 renderer options 适配、相关回归测试补齐。
- Out: SSR/hydration、Teleport/Suspense/Transition 等高级特性、与锚点无关的 diff 性能优化。

## Action items

[ ] 明确目标不变量并对齐现状：整理 Vue3 的 `el/anchor + Comment 占位 + getNextHostNode + move(vnode)` 数据流，并标注当前实现中与之冲突/冗余的点（`shouldUseAnchor`、组件锚点、`handle.nodes` 同步点）。
[ ] 扩展宿主接口以支持“按区间遍历/移动”：在 `src/runtime-core/renderer.ts` 的 `RendererOptions` 增加 `nextSibling(node)`（必要时再加 `parentNode(node)`），同步更新 `src/runtime-dom/renderer-options.ts` 与 `test/runtime-core/patch/host-utils.ts`。
[ ] 引入 `Comment` VNode（对齐 Vue3 的空渲染占位）：在 `src/jsx-foundation/constants.ts`/`factory.ts`/`types.ts` 增加 `Comment` 标识与 `createCommentVirtualNode`，并从 `src/jsx-foundation/index.ts` 导出。
[ ] 调整 normalize 策略区分“根卸载”与“内部空渲染”：normalize 层对所有 `null/boolean` 子节点都生成 `Comment` vnode（完全对齐 Vue3），但根级 `render(undefined)` 仍保持卸载语义（可通过 `src/runtime-core/renderer.ts` 先判空再 normalize，或拆分 `normalizeVNode`/`normalizeRoot` 两套入口于 `src/runtime-core/normalize.ts`）。
[ ] 让 mount 路径真正“在最终位置插入”：给 `mountVirtualNode`/`mountElement`/`mountComponent` 增加 `anchor` 透传，删除 `src/runtime-core/mount/child.ts` 里“先 mount 再整体 move 到父 anchor”的补偿逻辑。
[ ] 实现 Vue3 风格的宿主范围辅助：新增/重写 `getFirstHostNode`/`getLastHostNode`/`getNextHostNode`（Fragment 用 `anchor`，Component 递归到 `instance.subTree`，其余用 `el` + `nextSibling`），集中放在 `src/runtime-core/patch/utils.ts`（或新文件）。
[ ] 实现统一的 `move(vnode, container, anchor)`：Element/Text/Comment 移动单节点；Fragment 用 `nextSibling` 遍历 `[start..end]`；Component 递归 move `instance.subTree`，并更新相应运行时元数据一致性。
[ ] 改造组件更新锚点来源：在 `src/runtime-core/component/render-effect.ts` 的更新分支中，用 `getNextHostNode(previousSubTree)` 作为 `patchChild(..., anchor)` 的插入锚点，逐步去除对 `instance.endAnchor` 的依赖。
[ ] 改造 keyed/unkeyed children diff 的移动实现：把 `src/runtime-core/patch/keyed-children.ts`/`driver.ts` 从 “move nodes array（依赖 `handle.nodes`）” 切到 “move vnode（依赖 `el/anchor + nextSibling`）”；相应地让 `findNextAnchor` 优先基于 `vnode.el`（而不是 `handle.nodes[0]`）。
[ ] 清理旧锚点体系并验证：在新路径通过后，删除/收敛 `shouldUseAnchor`、`ensureComponentAnchors`、`mountComponentSubtreeWithAnchors` 及相关实例字段；跑 `pnpm run test`，重点回归 `test/runtime-dom/render/component-anchor-regression.test.tsx`、`test/runtime-dom/render/anchor-edge-cases.test.tsx`、`test/runtime-core/patch/children-keyed.test.tsx`，补齐“空渲染占位 + keyed 重排 + 再显示”的边界用例。

## Decisions

- 允许进行任何 breaking change（包括扩展 `RendererOptions` 的宿主契约）。
- 接受“空渲染产生 Comment 节点”，并以贴近 Vue3 作为正确方向。
- normalize 层对所有 `null/boolean` 子节点都生成 `Comment`（完全对齐 Vue3），并通过“根级判空/拆分入口”保留 `render(undefined)` 的卸载语义。
