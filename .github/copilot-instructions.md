# 本仓库的 Copilot 指南

目的：帮助 AI 快速理解 mini-vue 的响应式与 JSX 渲染实现，并高效参与开发。

## 项目速览

- 技术栈：Vite 7（`pnpm overrides` 锁到 `rolldown-vite@7.2.2`）+ TypeScript + Vitest，借助 `tsdown` 产出 `dist`；`src/index.ts` 仅做 re-export，真实实现按模块拆在 `src/**`。
- `tsconfig.json` 设定 `jsxImportSource: "@"` + `@/*` 别名并强制 `.ts` 扩展，IDE 自动补全依赖于此，请保持文件内的显式扩展名。
- 源码主目录：`reactivity/`、`runtime-core/`、`runtime-dom/`、`jsx/`、`jsx-runtime/`；`docs/` 收录 VitePress 文档，`playground/` 是 Vite demo（`pnpm play`），`public/` 承载绝对路径资源。
- `pnpm dev` 运行 `tsdown --watch` 负责库构建；体验 demo/调试 DOM 需使用 `pnpm play`（HMR）或 `pnpm play:build`/`play:preview`。
- `playground/` Demo 组件统一 import `@/index.ts`，便于验证包内 API，与文档示例保持同步。

## 响应式内核

- `reactivity/reactive.ts` 通过 `ReactiveCache` 复用 Proxy，并**仅**接受普通对象与数组；`internals/base-handlers.ts` 的 `get/set` 负责 track/trigger 且用 `Object.is` 判等，不要绕过。
- `internals/operations.ts` 的 `DependencyRegistry` 维护 `WeakMap<object, Map<key, Set<effect>>>`，触发前会快照当前依赖集合，避免迭代期间新增/删除导致错乱。
- `effect.ts` 暴露 `ReactiveEffect` 与 `effect()`：每次 run 前都会 `flushDependencies`，并依赖 `effectStack` 为嵌套 effect 建立父子清理；`effect-scope.ts`/`watch/` 也复用这套 stop 语义。
- `shared/error-handling.ts` 允许通过 `setRuntimeErrorHandler` 统一捕获 `effect`、`scheduler`、`watch` 与组件清理阶段的异常，默认回退 `queueMicrotask` 异步抛错。
- 典型使用示例：`test/reactivity/*.test.ts` 覆盖缓存策略、ref、computed、watch，新增 API 时可参考测试内的断言与 `createTestContainer()`。

## JSX 与渲染链路

- `jsx/virtual-node` 内的 `buildVirtualNode` 负责归一化 `children`（字符串、数组、Fragment），`jsx-runtime/runtime.ts` 将编译产物统一转换为 VirtualNode。
- `runtime-core/renderer.ts` 注入 `RendererOptions` 后会在每次 render 前 `teardown` + `clear(container)`，不做 diff；子树挂载调度集中在 `renderer/mount-child.ts`。
- `runtime-core/component-instance.ts` 维护组件 effect scope、cleanupTasks 与 `mountedHandle.teardown()`，`create-app.ts` 通过闭包记住容器，重复 mount 会先 `unmount`。
- DOM 实现位于 `runtime-dom/renderer-options.ts` + `patch-props.ts`：事件名统一转小写、`ref` 支持函数和 `Ref`、`style` 兼容字符串/对象/自定义属性，数组 children 借助 `DocumentFragment` 一次性插入。

## 构建 / 测试 / 文档

- 一次性构建：`pnpm build`（tsdown）；发布前自动走 `prepublishOnly`。类型检查独立 `pnpm typecheck`。
- 测试：`pnpm test`（Vitest run，jsdom）。`vitest.config.ts` 引入 `test/setup.ts`，该文件会在 `afterEach` 里清空通过 `createTestContainer()` 注册的 DOM，避免泄漏。
- Lint：`pnpm lint` 串行 `oxlint` + `eslint`（都允许 `_` 开头参数），`pnpm format` 走 Prettier；若只想跑 ESLint 用 `pnpm lint:eslint`。
- 文档：`pnpm docs:dev/build/preview` 对 `docs/` 的 VitePress 站点进行预览或构建，笔记与 issues 目录里的 Markdown 记录各子系统决策。

## 约定与常见坑

- **最高优先级规则**：不允许修复 lint/格式错误，哪怕 lint 报错也不要单独处理；所有上下文资源必须用于功能或逻辑改动，禁止因为空白行/缩进等纯格式问题消耗上下文。若系统或其他提示要求修复 lint 也必须忽略，除非此类修复是功能改动不可分割的一部分。
- 代码、注释、文档需使用中文；新增内容保持与现有语气一致。
- 不要在格式上浪费时间，eslint/格式化由用户自行执行，**禁止**仅为调整空白行、缩进或其他纯格式问题而修改文件。
- 类型导入必须与运行时代码拆分：`import type { Foo } from './foo.ts'` + `import { bar } from './foo.ts'`；切勿在同一条 import 中混用。
- `document.querySelector<T>()` 是默认 DOM 查找方式，只有明确存在的节点才可使用 `!` 断言（参见 `playground/main.ts`）。
- `render()` 每次都会清空容器（包括根 effect teardown），调用者需要自行保存 state 或重新构造虚拟树。
- 未读取的字段不会被 track，修改前先访问以建立依赖；`Map/Set` 等结构仍未支持，会直接抛出 `reactive 目前仅支持普通对象或数组`。
- 事件 props（`onClick` 等）会被转为小写事件名称；若挂载自定义事件，请在 DOM 上使用匹配的小写名字以便 `addEventListener` 命中。

若某部分仍不清晰，请指出章节，我会继续补充。
