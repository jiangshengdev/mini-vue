---
name: mount-patch-env-simplify
description: Flatten mount/patch environment types and clarify anchor/context propagation
---

# Plan

为挂载/更新路径统一上下文与环境类型，减少层层包装与重复规范化，确保 anchor/context 传递清晰可控。

## Requirements

- 扁平化容器/锚点/上下文传参，消除冗余的 BasePatchEnvironment/PatchEnvironment 包装。
- 保持 mount/patch 共享相同的上下文语义，避免重复 normalize。
- 调整类型与导出后，调用点编译通过，行为与现有策略一致（尤其是 shouldUseAnchor 传递）。

## Scope

- In: src/runtime-core/mount/context.ts, src/runtime-core/patch/context.ts, children-environment.ts, insertion.ts, child.ts 等使用相关环境类型的文件。
- Out: 组件逻辑、diff 算法行为、宿主 RendererOptions 接口。

## Files and entry points

- src/runtime-core/mount/context.ts
- src/runtime-core/patch/context.ts
- src/runtime-core/patch/children-environment.ts
- src/runtime-core/patch/insertion.ts
- src/runtime-core/patch/child.ts / children.ts / driver.ts

## Data model / API changes

- 统一导出一个 ChildEnvironment（容器/锚点/规范化 MountContext），PatchChildrenContext 基于此扩展 patchChild。
- PatchContext 在入口处转换为 MountContext，移除 normalizeMountContext 重复包装。

## Action items

[x] 设计新的 ChildEnvironment/PatchChildrenContext 定义，确认名称与导出位置。
[x] 调整 mountAndInsert/mountChild/patchChild 等函数签名，使用统一环境类型。
[x] 更新 normalizeChildContext（或等效函数）以仅负责 shouldUseAnchor，删除冗余的 normalizeMountContext。
[x] 批量修改调用点（children diff、patch driver 等），保证编译通过。
[x] 自查行为：锚点选择、ref/props 顺序、Fragment 子树 patch 等逻辑未被改变。
[x] 运行现有测试或最小验证（若可）确保无回归。

## Testing and validation

- pnpm test 或现有脚本（如有）；至少进行类型检查 pnpm test:type / pnpm lint。（按仓库实际命令调整）

## Risks and edge cases

- 规范化时机前移可能遗漏 shouldUseAnchor 传递，需逐调用点确认。
- 类型改动可能导致循环依赖或导出路径变动；需注意重导出位置。

## Open questions

- ChildEnvironment 放置于 patch/context.ts 还是独立文件？需要与 mount 目录共享吗？
- 是否保留 normalizeMountContext 作为兼容辅助（暂期弃用或移除？）。
