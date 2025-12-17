# Copilot 编码指南（mini-vue）

本仓库是简化版 Vue 3 运行时：响应式 + 平台无关渲染器 + DOM 宿主 glue + JSX 运行时。目标是让改动能快速落到正确分层与现有模式中。

## 结构与数据流（先找这些文件）

- 对外入口：`src/index.ts`（所有用户可见 API 从这里导出）。
- JSX 入口：`src/jsx-runtime.ts` / `src/jsx-dev-runtime.ts`，实现位于 `src/jsx-runtime/**` 与 `src/jsx-foundation/**`。
- `src/jsx-foundation/**`：vnode 工厂与 children 归一化等基础能力。
- `src/jsx-runtime/**`：`h`/`jsx`/`jsxs`/`jsxDEV` 等运行时封装。
- `src/reactivity/**`：响应式系统（effect/ref/computed/watch/effectScope 等）。
- `src/runtime-core/**`：平台无关渲染核心与组件/挂载流程。
- `src/runtime-dom/**`：DOM 宿主 glue（createApp、renderer options、props 映射等）。
- `src/router/**`：简化路由实现与组件（`RouterLink`/`RouterView`）。
- `src/shared/**`：跨子域共享工具与错误通道（内部 runner + 对外 `setErrorHandler`）。
- `src/messages/**`：按子域集中管理错误/警告文案，统一由 `src/messages/index.ts` 导出。
- `test/**`：按子域组织的 Vitest 用例（reactivity/runtime-dom/runtime-core/jsx-runtime/shared 等），全局 setup 在 `test/setup.ts`。

## 本项目特有约定（TS / 导入 / 边界）

- TypeScript ESM：源码内部导入保持显式 `.ts` 扩展名（`allowImportingTsExtensions: true`）。
- 路径别名：`@/* -> src/*`，`#/* -> playground/src/*`；`jsxImportSource: '@'`。
- `src` 一级目录视为边界：在同一边界内部禁止用 `@/当前边界/...`，必须用相对路径（对应检查脚本：`scripts/check/import/check-src-import-boundary.ts`）。
  - ✅ `src/reactivity/**` 内：`import { isNil } from '@/shared/index.ts'`
  - ❌ `src/reactivity/**` 内：`import { reactive } from '@/reactivity/index.ts'`

## 常用工作流（pnpm）

- 安装：`pnpm install`
- 开发：`pnpm play`（Vite playground） / `pnpm dev`（tsdown watch）
- 测试：`pnpm test`；更推荐 `pnpm test:browser`；调试用 `pnpm test:inspect`
- 构建：`pnpm build`（tsdown + 生成 JSX shim）

## Agent 执行约束

- 不要主动运行格式化/静态检查命令（`pnpm format`/`pnpm lint`/`pnpm typecheck`）；测试允许执行。
- 生成/建议提交信息时，遵循提交规范：[`/.copilot-commit-message-instructions.md`](../.copilot-commit-message-instructions.md)
- 删除文件/目录必须走命令行 `rm`/`rm -r`，且只能使用从仓库根目录起算的相对路径。
- 代码注释、日志输出、对话回复统一使用简体中文。
- 更完整的 Agent 约定见：[`src/AGENTS.md`](../src/AGENTS.md)
