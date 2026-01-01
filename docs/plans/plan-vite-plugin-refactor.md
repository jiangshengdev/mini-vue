# Plan

对 `src/vite-plugin/**` 做一次维护性重构，目标是降低重复实现、统一诊断文案管理，并补齐 `miniVueCompilerPlugin` 的组合测试；采用“小步提交 + 测试回归”的方式逐步抽取 `utils` 并迁移现有实现。本计划落盘于 `docs/plans/plan-vite-plugin-refactor.md`。

## Scope

- In: `devtools-setup-state-names/transform-props-destructure/transform-v-model-writeback` 的 DX 修复与代码去重；新增 `vite-plugin` 内部 `utils` 工具并统一复用；将插件告警/错误文案迁移到 `src/messages/**` 集中管理；补齐 `miniVueCompilerPlugin` 的聚合测试与对应计划勾选同步。
- Out: 变更现有 transform 语义（AST 命中规则/注入代码形态/诊断等级默认值）；新增编译期能力（如 `v-model-dom`）；引入 source map 输出或新增第三方依赖；调整对外 exports/发布结构。

## Action items

[x] 盘点现状：记录重复工具函数、诊断文案散落点、以及缺失的 `miniVueCompilerPlugin` 聚合测试。
[ ] DX：强依赖 TypeScript：移除“`typescript` 可选依赖/自动跳过”逻辑，统一改为直接使用 `typescript`（必要时调整依赖声明策略：dependencies/peerDependencies）。
[ ] Utils：新增 `src/vite-plugin/utils/id.ts` 统一处理 Vite `id`（`stripQuery` 等），替换各插件内重复实现。
[ ] Utils：新增 `src/vite-plugin/utils/ast.ts`（或等价文件）聚合 `unwrapExpression`、替换应用等通用 AST/源码改写工具，避免插件间重复与细节漂移。
[ ] Messages：新增 `src/messages/vite-plugin.ts` 定义编译期插件相关文案，并在 `src/messages/index.ts` 聚合导出；迁移现有插件内联文案到该处集中管理。
[ ] Refactor：让三个插件统一复用 `utils` 与 `src/messages/**`（保持对外 API 与测试断言不变），并在迁移过程中只做等价改写。
[ ] Tests：新增 `test/vite-plugin/index.test.ts` 覆盖 `miniVueCompilerPlugin` 默认启用/显式禁用/参数透传与顺序稳定性。
[ ] Docs：同步更新 `docs/plans/plan-mini-vue-compiler-plugin.md` 中对应未完成条目（DX 优化、测试与验证），并补充简短说明指向本计划。
[ ] Validation：运行 `pnpm run test`，并确认 `vite-plugin` 相关用例覆盖“文案迁移后仍能稳定断言”的回归场景。

## Open questions

- 无（已确认：内部目录命名倾向 `utils/`；插件文案迁移到 `src/messages/**`；默认强依赖 TypeScript，不考虑 `typescript` 缺失场景）。
