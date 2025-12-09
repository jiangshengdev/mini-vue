# Copilot 使用指南

- 范围：本仓库是简化版 Vue 3 运行时，核心分为两块：`src/reactivity/**` 负责响应式（effect、ref、watch、effect scope），`src/runtime-core/**` 负责平台无关的渲染，`src/runtime-dom/**` 提供 DOM 宿主 glue。JSX 构建在 `src/jsx-foundation/**` 与 `src/jsx-runtime/**`，对外入口为 `src/index.ts`。
- 架构
  - `runtime-core/renderer.ts` 的 `createRenderer` 与宿主无关：按容器缓存已挂载句柄，并调用宿主 `RendererOptions` 完成创建/插入/移除/patchProps。
  - `runtime-core/create-app.ts` 的 `createAppInstance` 包裹根组件并跟踪挂载状态，阻止重复 mount；`unmount` 通过宿主 hook 清空容器。
  - DOM 侧在 `runtime-dom/create-app.ts` 处理字符串选择器解析、记录上次容器，并接入 Vite HMR：更新前卸载，更新后按原容器重挂。
  - DOM 变更集中在 `runtime-dom/renderer-options.ts` 与 `patch-props.ts`：class 归一化，style 支持字符串或对象键，事件名转小写，布尔/`null`/`false` 移除属性，`ref` 由挂载层处理，`ElementRef` 可为回调或 `Ref`。
  - 响应式围绕 `reactivity/effect.ts` 的 `ReactiveEffect`：利用 `effectStack` 收集依赖，支持调度器，`stop` 时清理依赖与嵌套 cleanup，并通过共享错误通道上报。
  - 错误处理：`shared/error-handling.ts` 的 `setErrorHandler` 注册全局处理器覆盖 effect/watch/scope 错误；未处理的错误会用 `queueMicrotask` 异步重新抛出。
- 约定
  - TypeScript ESM，显式 `.ts` 导入，`moduleResolution: bundler`，`jsx: react-jsx`，`jsxImportSource: '@'`，别名 `@` 指向 `src`；新文件保持 strict，避免隐式 `any`。
  - 对外导出集中在 `src/index.ts`，对用户可见 API 变更优先从此导入。
  - DOM props：统一使用规范化的 `class`/`className`，对象 `style` 通过 `CSSStyleDeclaration` 赋值（不支持的键退回 `setProperty`），事件必须是 `onX` 函数。
  - Effect/Scope：父 effect 停止时会清理子 effect；不要手动改依赖桶，使用已有 cleanup 注册机制。
  - 组件/渲染：`createApp` 未 `unmount` 前禁止重复挂载；无壳 JSX 直接复用 `renderDomRoot`。
- 工作流
  - 安装：`pnpm install`（默认使用 pnpm）。
  - 构建库：`pnpm build`（tsdown 打包 + 生成 JSX shim），开发监听：`pnpm dev`。
  - Playground：`pnpm play`（Vite dev，走 `vite.config.ts` 别名），生产预览：`pnpm play:build` / `pnpm play:preview`。
  - 测试：`pnpm test`（Vitest + jsdom，无超时，`test/setup.ts`），按模块分布在 `test/**`（reactivity、runtime-dom、jsx-runtime）。
  - Lint：`pnpm lint` 跑 oxlint + eslint；类型检查：`pnpm typecheck`；格式化：`pnpm format`。
  - API 报告：`pnpm api` 基于 `api-extractor.jsonc`，发布流程 `pnpm release`（bumpp + publish），`prepublishOnly` 会先构建。
- 修改提示
  - 优先在现有目录内拆小模块（`reactivity`、`runtime-core`、`runtime-dom`、`jsx-*`、`shared`）；平台无关逻辑留在 `runtime-core`，DOM 细节放 `runtime-dom`。
  - 包装用户回调时保留 `handleError` 路由；新增执行入口用 `shared` 的 `runSilent`/`runThrowing`。
  - 扩展 DOM 能力时保持 props 归一化与 HMR 行为，更新 `patch-props.ts` 并补充 `test/runtime-dom/**`。
  - 新特性请在对应区域补测试（如响应式行为 -> `test/reactivity`，JSX 变更 -> `test/jsx-runtime`）。

- 交流与输出：代码注释、日志输出（含 print/console）、对话回复均使用简体中文。
