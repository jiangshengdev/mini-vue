# Agent 约定（编码 / 格式 / TS 约束）

本文件用于给自动化 Agent/脚本一个“最小但明确”的项目约定，避免引入风格与构建配置上的噪音。

## 编码与换行

- 统一使用 **UTF-8（无 BOM）**。
- 统一使用 **LF** 换行。

## 代码格式（Prettier）

项目格式化以仓库根目录的 `.prettierrc` 为准：

- `semi: false`
- `singleQuote: true`
- `printWidth: 100`

## Lint 约定

- TypeScript：`strict: true`（避免隐式 any）。
- 未使用变量：允许以下划线开头（如 `_`、`_err`）。

## TypeScript / ESM 导入约定

- 本项目为 **TypeScript ESM**（见 `package.json` 的 `type: module`）。
- 源码内部导入请保持 **显式 `.ts` 扩展名**（项目配置 `allowImportingTsExtensions: true`，并在仓库中普遍采用该风格）。
- `moduleResolution: bundler`。
- JSX：`jsx: react-jsx` 且 `jsxImportSource: '@'`。
- 路径别名：`@/* -> src/*`，`#/* -> playground/src/*`。

### `src` 顶层目录的导入边界

在 `src` 目录内，每一个**一级目录**（例如 `src/reactivity`、`src/runtime-core`、`src/runtime-dom`、`src/router`、`src/shared`、`src/jsx-*`）都视为一个边界：

- `@` **只**用于导入“当前一级目录之外”的内容。
- 在同一个一级目录内部，禁止使用 `@/当前目录/...` 这种写法；必须使用 `./`、`../` 等相对路径。

示例：

- ✅ `src/reactivity/**` 内：`import { isObject } from '@/shared/index.ts'`
- ✅ `src/reactivity/**` 内：`import type { EffectInstance } from './contracts/index.ts'`
- ❌ `src/reactivity/**` 内：`import { reactive } from '@/reactivity/index.ts'`

## 命名约定

- TSX 组件文件使用 **小写 + 中划线（kebab-case）** 命名（如 `router-link.tsx`、`counter-demo.tsx`）。
- 单词只有一个时允许不含中划线（如 `counter.tsx`），但多词必须用中划线分隔。

## Git 提交信息

提交信息遵循 Vue 社区常用的 Conventional Commits 风格：

- 格式：`<type>(<scope>): <subject>`
- `type` 常用：`feat` / `fix` / `docs` / `refactor` / `perf` / `test` / `chore` / `build` / `ci` / `revert`
- `subject` 使用简短祈使句，不以句号结尾

## Agent 执行约束

- Agent **不要主动执行**任何自动化格式化或静态检查命令（包括但不限于：`pnpm format`、`pnpm lint`、`pnpm typecheck`）。
- 编码过程中即使出现格式/风格类问题，也**无需专门修复**；由用户在提交前运行自动化格式化与检查统一处理。

### 测试

- 测试是允许执行的；更推荐使用浏览器模式：`pnpm test:browser`。

## 交流与输出

- 代码注释、日志输出、对话内容统一使用 **简体中文**。
