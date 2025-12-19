# runtime-core Patch 环境签名收敛 — Design

## 1. 现状与问题

- `src/runtime-core/patch/child.ts` 仍手写 `environment: { container; anchor?; context? }`，未复用已存在的 `PatchEnvironment`（`children-environment.ts`）。同一文件 `patchExisting`/`patchComponent`、`patchElement` 也各自写了局部 shape，导致类型重复且易漂移。
- `patchChildren` 需要调用方提供 `patchChild` 回调；当前在 Fragment 分支里显式传入 `patchChild`，看起来多余，但实际上为了避免 `children.ts` 反向引用 `child.ts`（循环依赖）并保持 `patchChildren` 可替换/测试。

## 2. 目标与原则

- 子节点 patch 环境统一使用 `PatchEnvironment`（或其子集），避免手写匿名 shape。
- 允许 `patchChildren` 持续依赖外部注入的 `patchChild`，明确这是「避免循环依赖 + 便于替换」的约束，而非冗余参数。

## 3. 方案

1. 将 `patchChild`/`patchExisting`/`patchComponent` 的 `environment` 参数改为 `PatchEnvironment`。
2. `patchElement` 仅需要 `anchor/context`，收敛为 `Pick<PatchEnvironment, 'anchor' | 'context'>`。
3. 保留 `patchChildren(..., { patchChild, ... })` 的调用方式，并在注释/规范中记录其目的。
4. 验证：`pnpm typecheck`。

## 4. 影响范围与风险

- 仅类型签名与类型导入调整，不改变运行时逻辑。
- 若后续扩展 `PatchEnvironment` 字段，可一次性生效于所有调用点，降低漏改风险。
