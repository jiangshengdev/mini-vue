---
name: runtime-core-patch-inspect
description: 使用 inspect.prompt 规则审查 src/runtime-core/patch 目录
---
# Plan

按 `.github/prompts/inspect.prompt.md` 的规则审查 `src/runtime-core/patch` 下的代码，列出潜在问题与定位，供后续修复参考。

## Requirements
- 仅依据 inspect.prompt 的审查流程与输出格式。
- 覆盖 `src/runtime-core/patch` 目录中的实现与其直接显式导入的文件。
- 发现问题按严重度标注（Critical/Major/Minor），不提供修复方案。

## Scope
- In: `src/runtime-core/patch/**` 及其显式导入链上的文件。
- Out: 其他子域代码（reactivity/runtime-dom 等）除非由显式导入触达。

## Files and entry points
- `src/runtime-core/patch/index.ts`
- `src/runtime-core/patch/child.ts`
- `src/runtime-core/patch/children.ts`
- `src/runtime-core/patch/unkeyed-children.ts`
- `src/runtime-core/patch/keyed-children.ts`
- `src/runtime-core/patch/keyed-children-helpers.ts`
- `src/runtime-core/patch/runtime-vnode.ts`
- `src/runtime-core/patch/types.ts`
- `src/runtime-core/patch/utils.ts`
- 其他被上述文件显式导入的依赖。

## Data model / API changes
- 无；仅做审查与问题记录。

## Action items
[x] 阅读 inspect.prompt 规则，准备审查输出模板。
[x] 遍历 `src/runtime-core/patch` 文件并跟进显式导入，按规则记录潜在问题。
[x] 汇总发现，按严重度排序输出审查结论。

## Findings
- [Major] keyed children 中间段复用不校验 vnode 类型：`keyed-children.ts` 在 91-115 行记录 newIndex 后直接 `patchChild`，即使新旧 vnode 类型不同也当作复用，导致替换节点在移动阶段仍沿用旧宿主节点，出现插入锚点错误或顺序错乱。
- [Major] `isSameVirtualNode` 对 `Text` 忽略 key：`utils.ts` 51 行认为任意 Text 都可复用，keyed diff 下不同 key 的文本节点会被错误复用，跳过卸载/插入与移动，破坏带 key 文本列表的顺序。

## Testing and validation
- 无需测试；纯静态审查。

## Risks and edge cases
- 漏查通过间接依赖暴露的问题；需确保显式导入链完整覆盖。

## Open questions
- 是否需要对运行时行为附加复现步骤说明？（若需要可补充在问题描述中简要说明触发条件）
