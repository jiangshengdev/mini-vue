---
name: runtime-core-patch-fix
description: 修复 keyed children 与 Text key 处理缺陷并补充测试
---
# Plan

修复 runtime-core patch 子域在 keyed children 与 Text 节点 key 处理上的已知缺陷，确保 diff 复用与移动语义与 key 一致，并补充回归测试。

## Requirements
- 修正 keyed 中间段复用需同时校验 vnode 类型，避免误复用导致插入/移动错序。
- Text vnode 在 keyed 场景下必须尊重 key，避免不同 key 的文本被复用。
- 补充针对性单测覆盖上述场景（keyed/unkeyed 差异、文本 key）。

## Scope
- In: `src/runtime-core/patch/keyed-children.ts`、`src/runtime-core/patch/utils.ts`、相关测试 `test/runtime-core/patch/**`.
- Out: 非 patch 子域实现，宿主 renderer 具体行为（除必要模拟）。

## Files and entry points
- src/runtime-core/patch/keyed-children.ts
- src/runtime-core/patch/utils.ts
- test/runtime-core/patch/children-keyed.test.tsx
- test/runtime-core/patch/children-unkeyed.test.tsx（若需对比）
- 其他 patch 测试入口（如需新增）

## Data model / API changes
- 无 API 变更，调整 diff 逻辑与测试。

## Action items
[x] 复现并锁定问题：构造不同类型同 key、不同 key Text 的 keyed 列表场景，确认现有行为与预期差异。  
[x] 调整 `isSameVirtualNode`：在 Text 节点也考虑 key，确保 keyed 场景不误复用。  
[x] 收紧 keyed 中间段复用：`patchAlignedChildren` 在记录复用前校验 vnode 类型（或复用判定），避免跨类型误复用。  
[x] 补充/更新 keyed children 测试：覆盖跨类型同 key 替换、不同 key Text 顺序保持、移动/锚点正确性。  
[x] 视需要更新 unkeyed/回归测试，确保无 key 路径行为不受影响。  
[x] 运行相关测试套件（patch 子域）验证修复。

## Testing and validation
- `pnpm test test/runtime-core/patch/children-keyed.test.tsx`（已通过）  
- 如有新增文件，补充对应路径；必要时运行 `pnpm test test/runtime-core/patch`

## Risks and edge cases
- 修正规则可能影响无 key Text 复用路径，需确保 unkeyed 不回退。  
- 键值为空/null 的节点判定需与现有 hasKeys 语义一致，避免新增回归。

## Open questions
- keyed 场景是否需要更严格的类型相等定义（如组件函数引用变化）？  
- 是否需要补充 DEV 警告提示重复 key 或跨类型复用？
