---
name: runtime-core-anchor-plan
description: Fix runtime-core anchor/children ordering bugs and tests
---

# Plan

为 runtime-core 的锚点/children 行为补齐规范与修复路线，避免组件/片段在带锚点插入时顺序错乱。

## Requirements

- 组件需在带外部锚点的场景下正确创建并使用占位符，保持兄弟顺序。
- 组件的锚点应随 handle/nodes 移动，避免 keyed diff 后锚点滞留。
- 当父级传入 anchor 时，子节点的上下文仍能保留 shouldUseAnchor，避免最后一个子组件更新时失序。
- 保持现有 API 兼容，对宿主 RendererOptions 无新增要求。

## Scope

- In: `runtime-core/component/anchor.ts`、`component/render-effect.ts`、`environment.ts`、`patch/keyed-children.ts` 及相关测试。
- Out: DOM/host 实现细节、非锚点相关的 patch 逻辑。

## Files and entry points

- src/runtime-core/component/anchor.ts
- src/runtime-core/component/render-effect.ts
- src/runtime-core/environment.ts
- src/runtime-core/patch/keyed-children.ts
- test/runtime-core/\*\*（补测锚点与移动场景）

## Data model / API changes

- 无对外 API 变更；可能需要让组件 handle/nodes 携带锚点或额外标记以便移动。

## Action items

[x] 调整组件锚点创建：在存在外部 anchor 时保持占位符随节点一起移动，并保证 anchor 写回实例。  
[x] 让组件 handle/nodes 包含锚点或更新路径同步 instance.anchor，使 keyed 移动时占位符随节点移动。  
[x] 更新 deriveChildContext 或 mount children 调用，确保父级带 anchor 时末尾子节点也能保留 shouldUseAnchor。  
[x] 补充覆盖 keyed/unkeyed + 组件 rerender 的锚点顺序用例，验证 mount/patch/move。  
[x] 回归现有 runtime-core 渲染/组件相关测试，确认无兼容性回归。

## Testing and validation

- `pnpm run test`（至少覆盖 runtime-core 套件）。
- 针对新增场景的定向用例：组件插入带锚点位置后的 rerender、keyed 组件移动后再次 rerender。

## Risks and edge cases

- 片段/数组子节点与组件锚点的组合可能仍有边界，需确保 handle.nodes 顺序一致。
- 不同宿主实现（DOM/测试双端）的 insertBefore 语义差异可能影响锚点定位。

## Open questions

- 组件 handle 是否需要显式记录 anchor 节点，还是复用 nodes[0]/nodes[-1] 足够？ 需在实现前决定。
