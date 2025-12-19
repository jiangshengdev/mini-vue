---
name: runtime-core-mount-naming-review
description: runtime-core mount 子域命名审计与重命名计划
---

# Plan

梳理 `src/runtime-core/mount` 下的导出/辅助命名，避免含糊的 children/anchor 语义，保持与 patch 子域的术语一致。

## Requirements
- 遵循 `.github/prompts/naming.prompt.md` 的命名诊断粒度与输出格式。
- 优先关注对外导出的类型/函数（`mountChild`、`mountChildren`、`MountedHandle` 等），确保语义明确、作用域清晰。
- 保持 PascalCase/camelCase 约定，避免引入新的含糊缩写或与上下文混用的命名。

## Scope
- In:
  - `src/runtime-core/mount/*.ts` 内导出的接口、类型、函数、工具方法。
  - 与锚点/子节点挂载语义相关的上下文字段命名（如 `shouldUseAnchor`）。
- Out:
  - patch/renderer 等其他子域的命名调整（除非为保持一致性所需）。

## Files and entry points
- src/runtime-core/mount/child.ts
- src/runtime-core/mount/children.ts
- src/runtime-core/mount/element.ts
- src/runtime-core/mount/handle.ts
- src/runtime-core/mount/index.ts
- src/runtime-core/mount/virtual-node.ts

## Data model / API changes
- 已重命名：`mountChildren` -> `mountElementChildren`，并同步 re-export 与调用方。

## Naming findings
- `mountChildren`（src/runtime-core/mount/children.ts）仅用于元素子节点挂载，名称过于泛化，容易与顶层 children/mount 混淆。（已更名为 `mountElementChildren`）

## Action items
[x] 审核 mount 子域导出命名的使用范围与对外影响
[x] 调整 `mountChildren` 命名并同步调用/注释，确保语义聚焦元素子节点
[x] 扫描 `runtime-core` 其他子域引用并更新导入/导出
[x] 按需运行 `pnpm run typecheck`/`pnpm run test` 验证重命名不影响行为
[x] 更新计划与测试记录，关闭相关 open questions

## Testing and validation
- 已执行：`pnpm run typecheck`（通过）
- 如涉及组件/renderer 行为，按需补充 `pnpm run test`

## Risks and edge cases
- 导出函数重命名可能影响 renderer/component/patch 引用，需一次性更新以避免编译失败
- 若锚点语义命名调整需确认与 patch 子域一致，避免混用「context/environment」

## Open questions
- 暂无（锚点字段命名暂保持 `shouldUseAnchor`）
