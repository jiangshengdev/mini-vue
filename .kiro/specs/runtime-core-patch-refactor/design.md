# runtime-core Patch 代码重构 — Design

## 0. 当前梳理（Phase 0.1）

- 挂载阶段：`mountChild` 只接受 `container/context`，始终 append 插入；`shouldUseAnchor` 仅用于数组/Fragment 包裹锚点与向子项透传，但不会直接插入到外部锚点。`mountVirtualNode` 将 Fragment/组件的 `anchor` 设为首末宿主节点，元素无 anchor。
- `patchChild` 新增/组件降级重挂路径：先 `normalizeMountContext`（重置 `shouldUseAnchor=false`）调用 `mountChild` append，再在存在 `environment.anchor` 时 `moveNodes`，形成「append + move」双写。
- children diff 新增路径：`unkeyed` 与 `keyed` 的新增都通过 `mountChild` append，再按「后继首节点 → environment.anchor」回退链计算锚点后调用 `moveNodes`；`createChildEnvironment` 生成的 `shouldUseAnchor` 仅影响子项内部（如数组包装），不会让 mount 阶段直达最终位置。
- runtime 元数据：`syncRuntimeMetadata`/`getHostNodes` 假定 `handle/el/anchor` 存在；`moveOrMountChildren` 缺失宿主引用时会获得空数组而静默跳过移动。Fragment 的锚点只在 mount 写入，patch 过程中缺失不会重建。

## 1. 现状与问题

- 锚点策略分散：`patch/child.ts` 在新增节点时将 `context` 归一化为 `shouldUseAnchor: false` 再调用 `mountChild`，随后再 `moveNodes`；而 `keyed/unkeyed` 分支直接用 `mountChild + moveNodes` 并各自寻找锚点，导致插入语义分裂且多做一次插入+移动。锚点何时生效、何时回退到父级 `anchor` 缺少统一约束。
- 宿主操作与 patch 行为耦合重复：新增/卸载/移动的代码散落在 `child.ts`、`unkeyed-children.ts`、`keyed-children-helpers.ts` 中，各自处理上下文与 runtime 元数据，缺少「单节点操作」统一出口，后续改动容易漏同步（如 `syncRuntimeMetadata`、ref 解绑顺序）。
- runtime 元数据读取/写入缺少防御：`getHostNodes`/`syncRuntimeMetadata` 假定 `handle/el/anchor` 已存在，`keyed` 的移动阶段若遇到缺失宿主引用只会返回空数组，调试困难；Fragment 复用时也未显式重建缺失的 `anchor`。
- 失败与诊断信号缺失：`mountChild` 的 `ok` 未在 patch 流程中透出，`patchChild` 在组件更新时无法判断子树是否挂载成功，后续 `moveNodes`/`unmount` 只能依赖异常抛出，排障不友好。

## 2. 目标

- 统一「新增节点」的插入策略：能在知道锚点时一次插入到位，锚点回退链（子级 → 父级）有清晰规则。
- 将「单节点操作（mount/patch/unmount/move）」封装为可复用的驱动，children diff 只关心索引与锚点，不重复宿主调用与元数据同步。
- 补强 runtime 元数据与诊断：确保移动/复用前可检测缺失引用，必要时重建锚点或抛出明确错误。
- 保持对外行为不变（不改 renderer options/public API），但减少不必要的 DOM 移动并提升可维护性与可测试性。

## 3. 范围与约束

- 主要改动范围：`src/runtime-core/patch/**`，必要时动到 `mount/child.ts` 或辅助类型以支持新的驱动/锚点选项。
- 不触碰对外导出的 renderer API；如需调整 `mountChild` 签名，保持现有调用点兼容。
- 运行时语义保持一致：仅限重构/插入策略优化与防御性检查。
- 网络/依赖不新增；测试集中在 `test/runtime-core/**`。

## 4. 方案

### 4.1 锚点感知的挂载/插入管线

- 抽出 `mountAndInsert`（或等价 helper），接受 `{ container, anchor, context }`，在已知锚点时直接调用宿主的 `insertBefore` 完成最终位置插入；Fragment/数组分支也携带边界锚点，避免「先 append 再 move」。
- `patchChild` 的「新增」与 keyed/unkeyed 的「纯新增」统一通过该 helper，`normalizeChildContext` 产出的 `shouldUseAnchor` 不再被丢弃。
- 明确锚点回退链：优先使用「后继已存在节点」→ `environment.anchor` → `undefined`（由宿主决定默认插入位置），并在 helper 内记录到 runtime `anchor`。
- 计划落点：在 `src/runtime-core/patch` 下新增 `insertion.ts`（命名可微调），导出 `mountAndInsert` 接口：
  - 签名：`mountAndInsert(options, vnode, { container, anchor, context }) => MountedHandle | undefined`。
  - 需要扩展 `mountChild` 支持可选 `anchor`：存在锚点时内部使用 `insertBefore` 而非 `appendChild`，无锚点保持现状。
  - Fragment/数组场景保持首末锚点写入，但插入时也使用 `insertBefore`，确保「一次写到位」并携带 `shouldUseAnchor`。
  - `normalizeMountContext` 保留传入 `MountContext` 上的 `shouldUseAnchor`，让 `patch` 阶段新增节点也能走同一锚点策略。

### 4.2 单节点操作驱动

- 提供 `PatchDriver`（命名待定）封装 `patchChild` 依赖的宿主操作：`mountNew`、`reuseAndPatch`、`replace`, `remove`, `moveToAnchor`。
- keyed/unkeyed diff 通过 driver 的接口完成 mount/move/unmount，而不是直接触碰 `mountChild`/`moveNodes`，以便后续调整顺序/诊断时只改一处。
- driver 负责同步 runtime 元数据（含 ref 解绑/重绑顺序）并复用 `normalizeMountContext`，children diff 只传递索引、锚点与 vnode。
  - 计划落点：新增 `src/runtime-core/patch/driver.ts`，导出 `createPatchDriver(options, environment)` 返回 `{ mountNew, patchExisting, replace, unmountOnly, moveToAnchor }` 等方法，内部复用 `mountAndInsert`/`patchExisting` 逻辑。`keyed/unkeyed` 与 `patchChild` 改为使用 driver，移除分散的 `unmount`/`moveNodes`/`mountAndInsert` 调用。

### 4.3 runtime 元数据防御与诊断

- 扩展 `runtime-vnode.ts`：增加 `ensureHostNodes`/`assertRuntimeVNode` 等 helper，在缺失宿主引用时输出可读错误或补建锚点。
- `syncRuntimeMetadata` 支持可选的「写回锚点」与「组件/handle 缺失警告」，便于在 Fragment 复用或组件降级 mount 时发现异常。
- children diff 的移动阶段使用新的 helper，遇到空宿主集合时抛出/警告，避免静默 noop。

### 4.4 结果传递与错误面向测试

- 让 `patchChild`/driver 能返回 `PatchResult`（包含 `ok`、是否发生移动、使用的锚点），组件更新或调度路径可据此决定是否重试/跳过后续 move。
- 在 renderer/component 侧仅做非破坏性使用（如 debug 日志或 dev-only warning），保持成功路径行为一致。
  - 计划落点：`PatchResult` 至少包含 `{ ok?: boolean; usedAnchor?: HostNode | undefined; moved?: boolean }`，由 `PatchDriver`/`patchChild` 返回；组件 rerender 后可据此记录 `instance.mountedHandle` 或 DEV 日志。

### 4.5 测试与基准

- 为新增锚点管线与 driver 补充单元测试：
  - 知道锚点时只插入一次、不再 append+move（可通过 spy `insertBefore` 计数）。
  - Fragment/数组新增时 anchor 记录正确，后续 siblings 不错位。
  - keyed/unkeyed 在缺失 runtime 元数据时给出可见错误。
- 关键命令：`pnpm test --filter runtime-core`；必要时补充局部快照或调度器 stub。

## 5. 风险与兼容性

- 锚点策略收紧可能暴露现有隐式依赖（例如宿主实现默认 append）；需在 helper 内保留容错回退。
- driver 抽象若处理不好可能引入额外分支/开销，需要在 TS 类型与运行时分层，避免热路径退化。
- 诊断增强需谨慎分 DEV/PROD，避免生产包输出额外警告或抛错。

## 6. 验证

- 类型：`pnpm typecheck`。
- 行为：`pnpm test --filter runtime-core`；针对锚点/移动路径新增的 spy 测试必须覆盖。
- 代码健康：移除重复的 mount/move 代码块；`patch` 域的锚点策略与 runtime 元数据使用有集中注释/文档。
