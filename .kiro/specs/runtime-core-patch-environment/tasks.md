# runtime-core Patch 环境签名收敛 — Tasks

## Done

- [x] 用 `PatchEnvironment` 统一 `patchChild`/`patchExisting`/`patchComponent` 的 `environment` 参数，`patchElement` 用 `Pick<...,'anchor' | 'context'>` 收敛局部形态。
- [x] 补充注释，说明 `patchChildren` 的 `patchChild` 参数用于解耦与防循环依赖，防止后续被误删。
- [x] `pnpm typecheck` 验证类型收敛无回归。

## Next

- [ ] （空）
