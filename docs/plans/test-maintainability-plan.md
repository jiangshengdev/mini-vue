# 计划：测试可维护性与隔离改造

本计划聚焦于清理「测试污染 / 白盒耦合 / Mock 内部路径」三类问题，优先降低并发/随机失败风险，再逐步把测试从“实现驱动”迁移到“行为驱动”。允许在必要时修改 `src/**`（含较大改动），但所有涉及 API/结构调整的变更会在动手前先二次确认方案与边界。

关联问题记录：

- `docs/issues/jsx-foundation-issues.md`：#3、#4
- `docs/issues/reactivity-issues.md`：#1、#2
- `docs/issues/router-issues.md`：#2
- `docs/issues/runtime-core-issues.md`：#12、#13、#14
- `docs/issues/runtime-dom-issues.md`：#5、#6
- `docs/issues/shared-issues.md`：#1

## 已确认的约束

- 不限制改动范围：允许改 `src/**`，必要时可做较大结构调整。
- 优先级按风险：先处理会污染全局/导致串扰的测试写法，再处理可维护性与架构耦合。
- 白盒测试不是绝对禁止：若黑盒难以覆盖，可保留白盒断言，但需要显式标注与说明。

## Scope

- In：
  - 统一测试清理策略（mock/spy/stub 与 DOM 容器清理），降低泄漏风险。
  - 收敛测试工具与 Host 渲染器工具，减少重复实现与脆弱样板。
  - 将 “Mock 内部模块路径 / 断言私有内部状态” 改为 “外部行为断言 / 稳定测试接缝（testing seam）”。
  - 对确需白盒的用例，建立统一标注与准入说明。
- Out：
  - 为了测试“顺手”而引入不必要的公共 API（除非作为稳定 testing seam 明确隔离）。
  - 不相关的功能重写/性能优化（除非被测试可测性阻塞且收益明确）。

## 总体策略（风险优先）

1. **先止血**：让所有测试默认“跑完必清理”，避免任何一次失败把后续测试拖下水。
2. **再去耦合**：减少对 `@/xxx/internal-file.ts` 的 mock 与对私有字段的断言。
3. **必要时引入稳定接缝**：通过显式的 `testing` 模块/依赖注入点替代“Mock 内部文件路径”。
4. **白盒可留但要可见**：统一标注、统一理由、统一退出策略（未来可替换黑盒时再迁移）。

## Action items（按阶段推进）

### Phase 0：基线与护栏（最高优先级）

[x] 在 `test/setup.ts` 增加全局清理：`vi.restoreAllMocks()` + `vi.unstubAllGlobals()`（与现有 `cleanupTestContainers()` 并存），并确认不会破坏依赖跨用例共享 mock 的测试（原则上不允许共享）。
[x] 补充一个轻量测试工具模块（建议 `test/test-utils/mocks.ts` 或扩展 `test/helpers.ts`）：统一封装 `spyOnConsole('warn'|'error')`、`stubGlobalQueueMicrotask` 等常用能力，避免每个用例手写 try/finally。
[x] 将现有“手动 restore”的用例迁移到全局清理：删除重复的 try/finally，仅保留必要的局部 `mockClear()`/断言。

### Phase 1：消除全局污染（并发风险）

[x] `test/runtime-dom/render/basic.test.tsx`：将修改 `Element.prototype.remove` 改为“只覆写具体实例”的 `remove`（同时对 `child.remove` 做 0 次断言），避免全局原型污染。
[x] `test/shared/error-channel.test.ts`：将直接覆盖 `globalThis.queueMicrotask` 改为 `vi.spyOn`/`vi.stubGlobal`，并依赖全局 `afterEach` 自动恢复。
[x] `test/jsx-runtime/jsx.test.tsx` 等：统一使用 `vi.spyOn(console, 'warn')` 并依赖全局恢复，避免手动管理导致泄漏。

### Phase 2：减少 Mock 内部路径（结构耦合）

[x] `test/router/core/error-cause.test.tsx`：移除 `vi.mock('@/runtime-core/index.ts')`，改为在组件 `setup()` 上下文内调用 `useRouter()` 来触发“未注入 router”的真实路径（不再依赖 runtime-core 模块结构）。
[x] `test/runtime-core/patch/child.test.tsx`：移除对 `@/runtime-core/patch/children.ts` 的 mock，改为断言最终宿主树结果与插入顺序（用外部行为验证“Fragment patch 使用片段锚点”），避免对内部调用栈与文件路径耦合。
[x] `test/reactivity/effect/basic.test.ts`：评估是否可用公开行为（依赖收集/触发次数/清理时机）替代对 `@/reactivity/internals/dependency.ts` 的 mock；若确需观测内部行为，引入明确的 testing seam（见 Phase 4）。

### Phase 3：降低白盒断言（实现耦合）

[ ] `test/runtime-core/provide-inject/provide-inject.test.ts`：将 `cause` 的断言从精确快照（如 `{ currentInstance: undefined }`）调整为更稳定的行为断言（例如仅断言会抛错且错误信息正确；`cause` 仅校验存在/类型），或将该用例标注为白盒并解释原因。
[ ] `test/reactivity/effect-scope/lifecycle.test.ts`：减少 `Reflect.get` 读取私有状态；优先用公开行为验证（父子 scope 关系、stop 后清理效果）。若无法替代，标注白盒并考虑引入 testing seam。
[ ] `test/runtime-dom/component/component.test.tsx`：将直接操作 `instance.cleanupTasks` 改为使用公开的清理注册方式（例如 `onScopeDispose`）来验证“清理抛错不阻塞后续清理 + error handler 被调用”，避免依赖组件实例私有字段。

### Phase 4：必要时的 “testing seam” 方案（需二次确认后落地）

[ ] 设计并确认稳定的测试接缝出口（择一或组合）：
  - A. `src/**/testing.ts`：对外暴露最小化的“可观测/可注入”能力（非 public API，文档注明仅测试使用）。
  - B. 依赖注入：在关键路径（如 router/useRouter、runtime-core patch）引入可选依赖参数，仅在测试中使用。
  - C. `__DEV__` 分支调试接口：仅开发态提供 debug 信息/钩子，生产构建 tree-shaking 掉。
[ ] 以最小试点验证：先选 1 个最难替代的内部 mock/白盒点落地 seam（建议从 `reactivity` 或 `runtime-core patch` 选一个），确认收益与维护成本。

### Phase 5：复用测试工具与收尾

[ ] `test/runtime-core/patch/insertion.test.ts`：复用 `test/runtime-core/host-utils.ts` 的 `createHostRenderer()` 与计数器，删除重复的 host options 构造（对应 `docs/issues/runtime-core-issues.md` #13）。
[ ] 为白盒用例建立统一标注规范（例如 `describe('[白盒] ...')` / `it('[白盒] ...')`），并在文件顶部用简短说明阐明白盒原因与可替代方向。
[ ] 同步更新 `docs/issues/*-issues.md`：将已完成项标记为已优化，并补充“采用的替代方案/测试接缝”说明，便于后续维护。

## 验证与质量门禁

- 最低：`pnpm run test`
- 若触及 DOM/renderer 行为：补跑 `pnpm run test:browser`
- 提交前建议：`pnpm run lint`、`pnpm run typecheck`、`pnpm run check`（或直接 `pnpm run preflight`）

## 待确认（动手前再确认一次）

1. 全局清理采用 `test/setup.ts` 的 `afterEach`，还是改为 Vitest 配置项（如 `restoreMocks: true`/`unstubGlobals: true`）？两者也可组合，但需要统一约定避免重复与误解。
2. 是否接受引入 `src/**/testing.ts` 作为稳定 testing seam（默认不从 `src/index.ts` 导出，避免误用）？
3. 是否允许移动/重分配个别用例到更合适的模块（例如将“remove 次数”类测试迁移到 runtime-core host 渲染器用例）以减少 DOM 全局污染？
