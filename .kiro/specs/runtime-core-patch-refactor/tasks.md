# runtime-core Patch 代码重构 — Tasks

> 目标：统一锚点插入策略、收拢宿主操作驱动，并增强 runtime 元数据诊断。任务按阶段拆分，便于逐步回归。

## Phase 0：基线梳理

- [x] 0.1 盘点锚点使用与元数据依赖
  - 输出：梳理 `mountChild`、`patchChild`、`keyed/unkeyed` 内的锚点回退链与 runtime 字段读写点（见 design.md「0. 当前梳理」）。

## Phase 1：锚点感知挂载

- [x] 1.1 抽出 `mountAndInsert`（命名待定）辅助，支持 `{ container, anchor, context }` 一次性插入，保留 Fragment/数组边界。
- [x] 1.2 `patchChild` 新增路径与 keyed/unkeyed 的纯新增路径统一使用 helper，确保 `normalizeChildContext` 产生的 `shouldUseAnchor` 不被丢弃，并将最终锚点写回 runtime。

## Phase 2：单节点操作驱动

- [x] 2.1 新增 driver 模块（例如 `patch/driver.ts`），封装 `mountNew`/`reuseAndPatch`/`replace`/`remove`/`moveToAnchor`，集中处理 ref 解绑与 `syncRuntimeMetadata`。
- [x] 2.2 将 `keyed-children(-helpers).ts`、`unkeyed-children.ts` 切换为调用 driver，移除重复的 `mountAndInsert`/`unmount` 片段，保持调用签名简洁。

## Phase 3：runtime 元数据防御与结果传递

- [x] 3.1 增强 `runtime-vnode.ts`/`utils.ts`：提供缺失宿主引用时的显式错误或 DEV 警告，必要时补建 Fragment 锚点；移动阶段使用防御性接口。
- [x] 3.2 让 `patchChild`/driver 返回 `PatchResult`（含 `ok`/使用的锚点/是否发生移动），组件更新路径按需记录或在 DEV 下输出诊断。

## Phase 4：测试与验证

- [x] 4.1 为锚点管线添加 spy 测试：已知锚点时只调用一次插入，不出现 append+move 的额外操作。
- [x] 4.2 补充 keyed/unkeyed 覆盖：Fragment/数组新增的锚点写回、缺失 runtime 元数据的错误提示。
- [ ] 4.3 `pnpm typecheck`；`pnpm test --filter runtime-core` 或更窄范围跑完。
