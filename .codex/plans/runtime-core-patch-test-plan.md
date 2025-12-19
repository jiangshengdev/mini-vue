---
name: runtime-core-patch-test-plan
description: 覆盖 runtime-core patch 子域的单元测试与回归用例
---
# Plan

梳理 `test/runtime-core/patch` 的测试缺口并制定补充用例，确保 patchChild/patchChildren 及 keyed/unkeyed diff 行为被充分覆盖。

## Requirements
- 聚焦 `src/runtime-core/patch/**`，补齐文本、元素、Fragment、组件以及 keyed/unkeyed children 的 patch 行为测试。
- 验证锚点与移动语义：包含 Fragment 边界、插入锚点、节点移动不重建。
- 覆盖回归场景：事件与 props 更新、ref 绑定顺序、错误恢复（保持旧 DOM）。

## Scope
- In: `test/runtime-core/patch/**` 新增或调整的 Vitest 用例；必要时在 `test/runtime-dom` 增加小量集成验证。
- Out: 非 patch 子域的功能测试（reactivity/runtime-dom 细节除非作为宿主验证）。

## Files and entry points
- 现有：`test/runtime-core/patch/patch.types.test.ts`、`test/runtime-core/patch/runtime-metadata.test.ts`、`test/runtime-core/patch/insertion.test.ts`
- 计划新增：`test/runtime-core/patch/child.test.ts`、`test/runtime-core/patch/children-keyed.test.ts`、`test/runtime-core/patch/children-unkeyed.test.ts`（可按主题拆分）

## Data model / API changes
- 无；仅新增测试。

## Action items
[x] 盘点现有 patch 测试覆盖的场景与缺口（文本复用、元素 props 更新、Fragment anchor、组件 patch）。
[x] 设计 unkeyed children 补充用例：公共区间 patch、追加/截断、嵌套元素锚点。
[x] 设计 keyed diff 用例：移动不重建、插入/删除、无 key 与有 key 混合、重复 key 防御。
[x] 设计元素/组件 patch 用例：props/事件更新、ref 解绑再绑定顺序、组件 rerender 失败回退。
[x] 设计 anchor/移动相关回归：Fragment 边界、父级 anchor 不污染子树、moveNodes 顺序保持。
[x] 落地测试并运行 `pnpm test test/runtime-core/patch`（必要时补充 runtime-dom 集成验证）。

## Findings
- 覆盖：`insertion.test.ts` 检查 mountChild/patchChild anchor 插入与 ensureHostNodes 的 DEV 警告；`runtime-metadata.test.ts` 覆盖文本 vnode 的 runtime 元数据复用；`patch.types.test.ts` 做类型签名校验。
- 缺口：未覆盖元素/Fragment/组件的 patch 行为、props/事件/refs 更新顺序、children diff（keyed/unkeyed）、锚点/移动语义、错误回退、防御性重复 key 等。

## Testing and validation
- `pnpm test test/runtime-core/patch`；如涉及宿主行为，补跑相关 runtime-dom 用例。

## Risks and edge cases
- 测试需谨慎依赖内部实现细节，避免过度绑定节点插入顺序以致重构易碎。
- keyed 场景需考虑重复 key 处理与无 key 兜底匹配，防止误判。

## Open questions
- 是否需要覆盖 LIS 相关移动优化（若实现后才补充）。
