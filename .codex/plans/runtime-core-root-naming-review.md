---
name: runtime-core-root-naming-review
description: runtime-core 根目录文件命名审计与调整计划（非子目录）
---

# Plan

审计 `src/runtime-core/` 根目录直接文件（非子域）中的导出/命名，统一术语并避免跨域混淆。

## Requirements
- 遵循 `.github/prompts/naming.prompt.md` 的命名诊断粒度与输出格式。
- 优先关注对外导出类型/函数（如 `createAppInstance` 相关配置、上下文工具等），确保语义准确。
- 保持 PascalCase/camelCase 约定，避免新增模糊缩写。

## Scope
- In: `src/runtime-core/` 下直接文件（`app-context.ts`、`create-app.ts`、`environment.ts`、`normalize.ts`、`provide-inject.ts`、`renderer.ts`、`vnode.ts`、`index.ts`）。
- Out: `component/`、`mount/`、`patch/` 等子目录（已有独立计划）。

## Files and entry points
- src/runtime-core/app-context.ts
- src/runtime-core/create-app.ts
- src/runtime-core/environment.ts
- src/runtime-core/normalize.ts
- src/runtime-core/provide-inject.ts
- src/runtime-core/renderer.ts
- src/runtime-core/vnode.ts
- src/runtime-core/index.ts

## Data model / API changes
- 已重命名：`AppRuntimeConfig` -> `AppHostDriver`，强调宿主驱动含义。

## Naming findings
- `AppRuntimeConfig`（src/runtime-core/create-app.ts）语义偏宽泛，实际仅包含宿主渲染/卸载原语，更贴近「宿主驱动」而非应用运行时配置。（已更名为 `AppHostDriver`）

## Action items
[x] 审核根目录导出命名，确认对外影响面
[x] 调整 `AppRuntimeConfig` 命名并同步入口导出/调用方
[x] 运行 `pnpm run typecheck` 确认改名不影响类型
[x] 更新计划/文档记录，关闭 open questions

## Testing and validation
- 已执行：`pnpm run typecheck`（通过）；如涉及行为变更，按需补充 `pnpm run test`

## Risks and edge cases
- 导出类型改名会影响 runtime-dom 与测试引用，需一次性替换
- 保持上下文/环境相关命名与子域一致，避免重复混用

## Open questions
- 暂无
