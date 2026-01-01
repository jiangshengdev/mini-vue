# Repository Guidelines

## 项目结构与模块划分

- `src/`：TypeScript 源码；核心分区有 `runtime-core/`、`runtime-dom/`、`reactivity/`、`router/`、`jsx-runtime/`，通用工具在 `shared/`，对外入口为 `src/index.ts`。
- `test/`：与 `src` 结构一一对应的 Vitest 用例（如 `test/reactivity/reactive.test.ts`），全局初始化在 `test/setup.ts`。
- 其他目录：`docs/`（VitePress 文档）、`playground/`（Vite 试玩与手动验证）、`scripts/`（导入/边界检查脚本）、`dist/`（构建产物）、`public/`（静态资源）。

## 构建、测试与开发命令

- 安装：`pnpm install`。
- 开发/构建：`pnpm run dev`（tsdown watch）、`pnpm run build`（tsdown + JSX shim 生成）。
- Playground：`pnpm run play`（开发）、`pnpm run play:build` + `pnpm run play:preview`（验证产物）。
- 测试：`pnpm run test`（Vitest + jsdom）、`pnpm run test:browser`（Playwright）、`pnpm run test:inspect`（调试）。
- 质量门禁：`pnpm run fmt`（Prettier）、`pnpm run lint`（oxlint + ESLint）、`pnpm run xo`、`pnpm run typecheck`（tsc）、`pnpm run check`（导入/边界规则）。提 PR 前建议跑 `pnpm run preflight` 或 `pnpm run ci`。

## 环境判断与 CI

- 环境判断：如果可用 MCP Server 列表中包含 `github-mcp-server`，视为运行在 GitHub 云端环境。
- 在 GitHub 云端环境下：每次完成代码修改后，都需要运行并通过 `pnpm run ci`（脚本为 `pnpm run preflight && pnpm run check`）。
- 在 GitHub 云端环境下：`pnpm run ci` 通过后，还需要运行并通过 `pnpm run test:e2e:all`、`pnpm run test`、`pnpm run test:browser` 进行验证。
- 规范策略：尽可能不要通过全局禁用 ESLint/XO 规则来“过关”；XO 可能非常严格，确实无法通过时允许使用最小范围的注释禁用，并在最终回复中明确说明必要的豁免或跳过的步骤与原因。
- 兜底策略：如果已经明确尝试修复但仍无法通过 `pnpm run ci`，则直接停止继续修改，并在最终回复中说明当前失败点与已尝试的处理，交由人工完成后续工作。

## 代码风格与命名

- TypeScript + ESM，内部导入可用 `@/` 别名避免相对路径穿越；模块优先使用具名导出与 index barrel。
- 导出约定：除仓库顶级入口文件（如 `src/index.ts`、`src/jsx-runtime.ts`、`src/jsx-dev-runtime.ts`）外，跨文件的重导出**只能**写在同级 `index.ts` 中；其他任何命名文件禁止通过 `export ... from` / `export * from` 重导出其他模块实现（含类型与值）。需要聚合导出时请新增/调整对应目录的 `index.ts`。
- 格式化由 Prettier（2 空格、单引号）控制，ESLint/Stylistic、oxlint、XO 共同约束风格；提交前请先格式化，否则 CI 会拒绝。
- 目录/文件名用 kebab-case，变量/函数 camelCase，类型 PascalCase；测试目录与源码保持平行以满足 `scripts/check` 边界规则。
- 空值约定：项目不使用 `null`，统一使用 `undefined` 表示「空/缺省」。

## 测试准则

- 在 `test/<子域>/` 下为对应的 `src/<子域>/` 模块补齐用例，文件名 `*.test.ts` / `*.spec.ts`，使用 `describe/it`。
- 回归案例优先，涉及 DOM/渲染的特性同步补充浏览器套件。必要时用 `expectTypeOf` 断言类型预期。
- 新功能至少跑 `pnpm run test`；如触及 DOM/renderer，补跑 `pnpm run test:browser`。
- Vitest 过滤（只跑某个文件）：`pnpm run test test/jsx-runtime/h.test.ts`（注意不要写成 `pnpm run test -- test/jsx-runtime/h.test.ts`）。

## 提交与 Pull Request

- 遵循 Conventional Commits：`type(scope): summary`，破坏性改动加 `!`（参见 `refactor(runtime-core)!`）。`scope` 采用小写简洁名，如 `reactivity`、`runtime-dom`、`docs`。
- PR 需说明目的、关联 issue、列出主要改动，并附测试命令与结果；若行为变更，请更新文档或 playground。发起评审前确保 `pnpm run preflight` 与 `pnpm run check` 通过。

## 其他

- 更完整的 Agent 行为规范见 [`.github/copilot-instructions.md`](.github/copilot-instructions.md)；自动化/工具链细节请保持同步更新两份文档。
- Vitest 浏览器模式限制：
  - 禁用会阻塞线程的同步弹窗（`alert`/`confirm` 等）；Vitest 会提供默认 mock，建议用自定义 mock 保持可控。
  - ESM 模块命名空间不可被 `vi.spyOn`，需要 `vi.mock(path, { spy: true })` 再通过 `vi.mocked` 调整实现；若要改写导出的可变值，请暴露 setter 方法。
- 文件写入约束（最高优先级）：禁止写入仓库外路径；如需使用 `~/.codex` 等路径，统一改为写入仓库内的 `.codex/` 目录。

## 交流与输出

- 代码注释、日志输出、对话内容统一使用 **简体中文**。
- 说明性注释中若包含代码片段，请用反引号包裹以突出代码内容。
