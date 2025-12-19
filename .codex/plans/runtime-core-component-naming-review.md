---
name: runtime-core-component-naming-review
description: runtime-core component 子域命名审计与重命名计划
---

# Plan

梳理 `src/runtime-core/component` 子域的导出命名，关注实例/挂载/渲染 effect/锚点等符号，统一术语并避免与 mount/patch 混用。

## Requirements

- 遵循 `.github/prompts/naming.prompt.md` 的命名诊断流程与输出格式。
- 优先检查对外导出（`mountComponent`、`createComponentInstance`、`mountChildWithAnchor` 等）和跨子域使用的类型/函数。
- 保持 PascalCase/camelCase 约定，减少模糊缩写；与 environment/context 相关的命名需清晰区分责任。

## Scope

- In:
  - `src/runtime-core/component/*.ts` 的导出类型、函数、辅助结构。
  - 与组件实例上下文、渲染 effect、锚点挂载相关的字段命名。
- Out:
  - 非 component 子域（除非为了对齐命名一致性必须修改）。

## Files and entry points

- src/runtime-core/component/index.ts
- src/runtime-core/component/context.ts
- src/runtime-core/component/instance.ts
- src/runtime-core/component/mount.ts
- src/runtime-core/component/anchor.ts
- src/runtime-core/component/render-effect.ts
- src/runtime-core/component/setup.ts
- src/runtime-core/component/props.ts
- src/runtime-core/component/teardown.ts

## Data model / API changes

- 已重命名：`mountChildWithAnchor` -> `mountComponentSubtreeWithAnchors`，同步 re-export、调用方与相关文档。

## Naming findings

- `mountChildWithAnchor`（src/runtime-core/component/anchor.ts）名称泛化且未体现「组件子树 + 锚点包裹」语义，易与通用 `mountChild` 混淆。（已更名为 `mountComponentSubtreeWithAnchors`）

## Action items

[x] 审核 component 子域的导出命名与调用范围，列出需要调整的符号
[x] 根据发现执行命名重构并同步引用/注释
[x] 运行必要的校验（`pnpm run typecheck` 等）确保改名未影响行为
[x] 更新计划文档与相关记录，关闭 open questions

## Testing and validation

- 已执行：`pnpm run typecheck`（通过）；如涉及行为路径，按需补充 `pnpm run test`

## Risks and edge cases

- 导出重命名可能影响 renderer/patch/mount 的交互，需一次性替换并校验类型
- 实例/上下文字段的命名调整需保持与 mount/patch 一致，避免语义漂移

## Open questions

- 暂无
