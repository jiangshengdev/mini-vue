# 本仓库的 Copilot 指南

目的：让 AI 代理快速在本仓库高效产出，传达真实的架构、工作流与项目约定。

## 大局观（Big Picture）
- 技术栈：Vite 7（通过 `rolldown-vite@7.2.2` 固定）+ TypeScript。注意：尽管仓库名含 “vue”，此项目不含 Vue 运行时，是纯 TS 演示。
- 入口：`index.html` 加载 `/src/main.ts`。构建产物输出到 `dist/`。
- 资源：`public/` 下为静态文件（以根路径引用，如 `/vite.svg`）；`src/` 下的资源以模块方式导入，Vite 会返回 URL（如 `import typescriptLogo from './typescript.svg'`）。

## 交流与注释约定
- 所有代码注释、文档与 AI 回复需使用中文。

## 开发工作流
- 安装依赖：`pnpm install`（使用 PNPM，锁文件为 `pnpm-lock.yaml`）。推荐 Node 18+ 以匹配 Vite 7。
- 启动开发（HMR）：`pnpm dev`
- 生产构建：`pnpm build`（先跑 `tsc` 类型检查，再 `vite build`）
- 本地预览：`pnpm preview`

## 源码布局
- `src/main.ts`：应用引导。导入全局样式、图片与 `setupCounter`，向 `#app` 写入模板并绑定事件。
- `src/counter.ts`：导出 `setupCounter(element: HTMLButtonElement)`，内部维护点击计数与事件处理。
- `src/style.css`：全局样式。
- `public/vite.svg`：示例静态资源，使用绝对路径 `/vite.svg` 引用。

## TypeScript 约定（见 `tsconfig.json`）
- 现代严格 ESM：`module: ESNext`、`target: ES2022`、`verbatimModuleSyntax: true`（保持原生 ESM 语义）。
- 打包器解析：`moduleResolution: bundler`，`types: ['vite/client']`。
- 导入风格：`allowImportingTsExtensions: true` —— 本地导入需包含 `.ts` 扩展（例如 `import { x } from './foo.ts'`）。
- 代码整洁：`noUnusedLocals`、`noUnusedParameters`、`noUncheckedSideEffectImports` —— 禁止仅副作用导入，保持导入被使用。
- 不产出 JS：`noEmit: true` —— 仅类型检查，构建由 Vite 负责。

## 约定与模式
- DOM 类型：优先使用 `document.querySelector<HTMLElement>('#id')`，当前代码对必然存在的节点使用非空断言 `!`；如节点可能缺失，请自行加守卫。
- “函数即组件”：倾向小而专注的函数，接收宿主元素并挂载行为。
  - 示例：新增 `src/hello.ts`
    ```ts
    export function mountHello(el: HTMLElement) { el.textContent = 'Hello' }
    ```
    在 `src/main.ts` 中使用：
    ```ts
    import { mountHello } from './hello.ts'
    mountHello(document.querySelector('#app')!)
    ```
- 资源放置：
  - 全局/静态资源放在 `public/`，以绝对路径（如 `/logo.svg`）引用。
  - 模块私有资源放在 `src/`，用 `import img from './img.svg'` 获得 URL 字符串。
- 导入路径：未配置 TS 路径别名；在 `src/` 内使用相对路径导入。

## 集成细节
- 通过 `package.json` 与 `pnpm.overrides` 将 Vite 固定为 `rolldown-vite@7.2.2`；CLI 用法与标准 Vite 一致。
- `pnpm dev` 提供 HMR 与 Source Map；生产构建面向现代浏览器（ES2022）。

## 易踩坑（Gotchas）
- 仅副作用导入会被 TS 拒绝（`noUncheckedSideEffectImports`）；确保导入均被使用或改为显式调用。
- 开启 `verbatimModuleSyntax` 后请避免“合成默认导入”，保持原生 ESM 语义。
- 若新增测试或 Lint，请与严格 TS 与打包器 ESM 设置保持一致。

## 关键文件
- `index.html`, `src/main.ts`, `src/counter.ts`, `src/style.css`, `public/vite.svg`, `tsconfig.json`, `package.json`。
