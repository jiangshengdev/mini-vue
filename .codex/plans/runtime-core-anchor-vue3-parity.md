---
name: runtime-core-anchor-vue3-parity
description: Align runtime-core anchor handling with Vue 3 fragment/Component anchor semantics
---

# Plan

将 runtime-core 的锚点/片段处理与 Vue 3 行为对齐，明确 start/end 锚点、移动与 rerender 语义，避免与上游差异导致的潜在回归。

## Requirements

- 对比 Vue 3：明确 Fragment/多根组件的首尾锚点策略，以及 keyed/unkeyed diff 中的移动/patch 流程。
- 若需引入双锚点或调整 handle.nodes/anchor 写入方式，确保与现有宿主 API 兼容。
- 补充或更新测试以覆盖与 Vue 3 对齐的关键场景（片段/组件移动、空子树、异步 patch 路径）。
- 保持现有用户 API 不变，并记录行为差异。

## Scope

- In: runtime-core anchor/Fragment/patch 流程、组件锚点管理、相关测试。
- Out: 宿主 renderer 具体实现、非锚点相关的 props/事件逻辑。

## Files and entry points

- src/runtime-core/component/anchor.ts
- src/runtime-core/mount/\*\*（如 fragment/child）与 normalize.ts
- src/runtime-core/patch/\*\*（尤其 runtime-vnode.ts、children/keyed/unkeyed.ts）
- test/runtime-core/patch/\*_/_.test.tsx、component/anchor.test.ts 等

## Data model / API changes

- 可能需要：为 Fragment/组件引入 start/end anchor 写入 runtime vnode；调整 handle.nodes 包含锚点的策略。
- 保持 RendererOptions 不变，如需锚点特殊处理需内部自处理。

## Findings (Vue 3 对比)

- Vue 3 的 Fragment 默认使用首尾双锚（两个空文本/注释），移动/卸载/空片段都依赖首尾边界；当前实现仅有单尾锚，空片段/组件移动时只有 end anchor。
- Vue 3 组件本身不记录锚点，依赖子树（Fragment）边界；当前组件有独立尾锚并不写入 handle.nodes，移动时靠 `ensureHostNodes` 追加单锚。
- Vue 3 `move` 逻辑按首尾锚移动整段，能处理空片段和首尾兄弟；当前单锚方案在“前插空片段/组件”或需要明确开始边界时可能与上游行为不同。

## Proposed approach

- 组件/Fragment 统一使用首尾锚：需要 anchor 时创建 start/end 两个文本锚点，并在 handle.nodes 中显式包含，便于 move/teardown 一致处理。
- ComponentInstance 扩展记录 startAnchor + endAnchor（沿用现有 anchor 作为 end），teardown 时一次性移除；runtime vnode.anchor 指向 endAnchor，el 指向 startAnchor。
- mountChildWithAnchor：在父容器中先插入 start/end，再以 endAnchor 作为插入锚 mount 子树（context.shouldUseAnchor 可为 false，保证节点落在 start/end 之间），handle 包含两端锚点。
- move/patch：`ensureHostNodes` 不再特殊补锚或仅作为兜底；依赖 handle.nodes 自带锚点即可，减少隐式行为。
- 兼容性：RendererOptions 无需改动，宿主仍只需要支持 insertBefore/appendChild/remove。

## Action items

[x] 对齐目标：梳理 Vue 3 在 Fragment/多根组件的锚点规则与移动策略，列出差异清单。  
[x] 设计方案：决定是否采用双锚点、是否将锚点纳入 handle.nodes，明确迁移步骤与兼容性。（草案：采用首尾锚+handle.nodes 携带）  
[x] 实现锚点写入/移动调整：更新 mount/patch/runtime-vnode，确保 keyed/unkeyed、组件 rerender 场景与 Vue 3 一致。  
[x] 更新/新增测试：覆盖 fragment/组件移动、空子树、无 key/有 key diff 与 rerender 的锚点顺序。  
[x] 回归测试与文档记录：跑 test/test:browser，并在计划/备注中记录与 Vue 3 的对齐点或残留差异。

## Testing and validation

- `pnpm run test`、`pnpm run test:browser`
- 重点回归：runtime-core/patch、component anchor、fragment 相关用例。

## Risks and edge cases

- 宿主未支持 fragment 特殊插入时，锚点策略需要保证不依赖宿主原生 fragment 行为。
- handle.nodes 中包含锚点可能影响现有移动/teardown 逻辑，需要确保 teardown 不重复移除。
- start/end anchor 与单锚模式切换时的迁移兼容。

## Open questions

- 是否需要严格复刻 Vue 3 的首尾注释锚点，还是保留单锚但补充行为一致性？
- 组件锚点与 Fragment 锚点的职责分界如何定义以避免重复/遗漏？
