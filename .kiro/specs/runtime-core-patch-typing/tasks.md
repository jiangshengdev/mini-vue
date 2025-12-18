# runtime-core Patch 类型优化 — Tasks

> 说明：按“先收敛不变量、再收紧类型、最后验证”的顺序拆分，便于逐步落地并随时回退。

## Phase 0：基线审计

- [x] 0.1 列出现有 `src/runtime-core/patch/**` 中的 `as`/`unknown` 强转点位与原因（含上下文/children/runtime 元数据）。输出：见 design §0「基线审计输出」强转热点。
- [x] 0.2 梳理 patch 入口/输出不变量：children 归一化入口、Text vnode shape、context 结构，形成待收敛清单。输出：见 design §0「类型不变量与风险点」。

## Phase 1：输入与上下文类型收敛

- [x] 1.1 为 patch 入口定义“已归一化 children”类型别名，更新 `patchChild`/`patchChildren`/调用方签名，阻断非 vnode 输入。
- [x] 1.2 对齐 PatchContext 与 MountContext 的基础接口，移除 `normalizeMountContext`/`normalizeChildContext` 中的 `as never`。

## Phase 2：节点形态与 runtime 元数据建模

- [x] 2.1 建立 Text/Fragment/Element/Component vnode 具名类型（含 Text 的 `text` 必选），并在 `patchExisting` 等分派处使用。
- [x] 2.2 为 runtime vnode 读取新增 helper/类型别名，封装 handle/el/anchor 访问，减少 `asRuntimeVNode` 与手动属性断言。

## Phase 3：环境与 keyed diff 类型化

- [x] 3.1 抽取 `PatchEnvironment`/`PatchChildEnvironment` 等通用类型，复用于 child.ts/children.ts/utils.ts，减少泛型重复。
- [x] 3.2 收紧 keyed diff 辅助结构（`IndexRange`/`KeyedPatchState`/`IndexMaps`）：明确哨兵值、索引边界与只读字段。

## Phase 4：类型回归与测试

- [x] 4.1 新增/更新类型用例（如 `test/runtime-core/patch.types.test.ts` 使用 `expectTypeOf`）覆盖 Text/Fragment/Element/Component 以及 keyed/unkeyed flows。
- [x] 4.2 运行 `pnpm typecheck`，必要时抽样执行 `pnpm test --filter runtime-core`，确认无运行时回归。
