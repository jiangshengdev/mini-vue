---
name: runtime-core-patch-naming-review
description: runtime-core patch 命名审计与重命名计划
---

# Plan

针对 `src/runtime-core/patch` 的命名进行审计，收敛术语并避免 context/environment 混用，确保导出符号语义清晰。

## Requirements
- 遵循 `.github/prompts/naming.prompt.md` 的命名诊断粒度与输出格式
- 覆盖 `src/runtime-core/patch` 下导出的类型/函数及辅助结构，优先解决对外符号
- 保持 PascalCase/camelCase 约定，避免引入新的含糊缩写

## Scope
- In:
  - `src/runtime-core/patch/*.ts` 中导出的接口、类型、函数命名
  - 与 children diff 驱动相关的字段命名（如 `IndexMaps` 等）
- Out:
  - 组件/renderer 其他子域的命名调整
  - 行为/性能修改（仅讨论命名）

## Files and entry points
- src/runtime-core/patch/child.ts
- src/runtime-core/patch/children.ts
- src/runtime-core/patch/children-environment.ts
- src/runtime-core/patch/driver.ts
- src/runtime-core/patch/keyed-children.ts
- src/runtime-core/patch/keyed-children-helpers.ts
- src/runtime-core/patch/unkeyed-children.ts
- src/runtime-core/patch/types.ts
- src/runtime-core/patch/runtime-vnode.ts
- src/runtime-core/patch/utils.ts

## Data model / API changes
- 已重命名：`PatchChildrenContext` -> `PatchChildrenEnvironment`、`mountAndInsert` -> `mountChildInEnvironment`、`IndexMaps.toBePatched` -> `middleSegmentCount`

## Naming findings
- PatchChildrenContext（src/runtime-core/patch/children-environment.ts）名称与 `MountContext`/patch 环境混用，“Context” 容易与应用上下文混淆，且与 `PatchEnvironment` 命名风格不一致。
  - 建议: PatchChildrenEnvironment、PatchChildrenScope
- mountAndInsert（src/runtime-core/patch/insertion.ts）名义上强调“挂载并插入”，但实现只是透传到 `mountChild`，缺少“包装环境”意图，容易被误解为额外插入逻辑。
  - 建议: mountChildInEnvironment、mountChildAtAnchor
- IndexMaps.toBePatched（src/runtime-core/patch/types.ts）字段语义是“中段待处理的新节点数量”，当前命名略抽象，难以联想到 keyed diff 中间段计数。
  - 建议: pendingNewCount、middleSegmentCount

## Action items
[x] 确认命名调整范围与对外 API 影响，锁定需要重命名的符号
[x] 针对 `PatchChildrenContext`/`mountAndInsert`/`toBePatched` 更新命名并同步注释，确保含义一致
[x] 扫描 `src/runtime-core` 及其他子域引用，更新导入与类型使用
[x] 逐步跑相关单测（如 children diff、component patch）验证重命名未引入行为变更
[x] 补充命名变更的文档或内联注释（如存在对外暴露）

## Testing and validation
- 已执行：`pnpm run typecheck`（通过）
- 待执行：`pnpm run test`（重点关注 runtime-core 相关用例）；若涉及 DOM/renderer 行为，按需补跑 `pnpm run test:browser`

## Risks and edge cases
- 导出符号重命名可能影响外部 API 或其他子域导入，需要一次性更新避免编译/运行时失败
- 重命名期间容易遗漏注释/日志中的旧名，需统一替换

## Open questions
- 暂无（转向 `src/runtime-core/mount` 子域继续审计）
