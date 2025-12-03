# Mini Vue

一个面向自学的 Vue 3 核心精简实现，覆盖响应式系统、JSX 渲染链路以及 jsdom 测试场景。项目基于 Vite 7 + TypeScript + Vitest，所有 API 由 `src/index.ts` 统一导出，方便在 Demo 与测试间共享。

## 特性亮点

- **响应式内核**：`reactive`、`effect`、`watch` 采用 `ReactiveCache` 复用代理，并包含依赖收集、清理与嵌套生命周期的完整实现。
- **JSX 渲染链路**：`runtime-core` 与 `runtime-dom` 解耦，renderer 通过宿主注入完成 vnode -> DOM 的挂载，暂不做 diff，易于调试。
- **DOM Demo**：`playground/` 提供 `App`/`Counter` 等组件，使用 `pnpm play`（含 HMR）即可体验响应式 + JSX 交互。
- **可验证的学习路径**：`test/` 中的 Vitest 用例覆盖缓存策略、effect 嵌套、渲染与属性打补丁流程，配套 `docs/` Markdown 记录便于查阅。

## 项目结构

```text
mini-vue/
├─ docs/                 # VitePress 文档与概念笔记
├─ playground/           # Vite Demo（App/Counter 等示例与样式）
├─ public/               # 通过绝对路径引用的静态资源
├─ src/
│  ├─ index.ts           # 对外暴露 reactive/effect/JSX API
│  ├─ jsx/               # VirtualNode 工厂与 children 归一化
│  ├─ jsx-runtime/       # JSX runtime（jsx/jsxs/jsxDEV）
│  ├─ reactivity/        # reactive/effect/ref/watch 等响应式实现
│  ├─ runtime-core/      # 平台无关 renderer、组件实例与挂载逻辑
│  ├─ runtime-dom/       # DOM renderer options 与 patchProps
│  └─ shared/            # 公共类型、工具与错误处理
├─ test/
│  ├─ jsx-runtime/       # JSX 产物与 h() 行为测试
│  ├─ reactivity/        # 缓存、computed、watch 等单元测试
│  ├─ runtime-dom/       # DOM 渲染/属性/组件集成测试
│  └─ setup.ts           # jsdom 容器注册与 afterEach 清理
├─ env.d.ts              # Vite/TS 类型补充
├─ eslint.config.ts      # ESLint + oxlint 配置入口
└─ tsconfig.json         # `@/*` 别名与 JSX 编译配置
```

## 快速开始

1. 安装依赖（推荐 Node 18+ 与 pnpm 9）：
   ```bash
   pnpm install
   ```
2. 启动 Demo（默认 http://localhost:5173）：
   ```bash
   pnpm play
   ```
3. 运行测试（单次 run，jsdom 环境）：
   ```bash
   pnpm test
   ```

## 常用脚本

- `pnpm dev`：以 `tsdown --watch` 监听 `src/`，实时生成库构建产物，便于联调 API。
- `pnpm play`：运行 Vite Demo；需要打包或本地预览可分别使用 `pnpm play:build`、`pnpm play:preview`。
- `pnpm test`：`vitest run`（jsdom 环境），适合一次性验证响应式 + DOM 行为。
- `pnpm build` / `pnpm typecheck`：前者调用 `tsdown` 产物构建，后者执行 `tsc --noEmit` 做纯类型检查。
- `pnpm lint` / `pnpm format`：lint 聚合 `oxlint` 与 `eslint`，format 走 Prettier 覆盖 `docs`、`playground`、`src`、`test`。
- `pnpm docs:dev` / `docs:build` / `docs:preview`：管理 VitePress 文档站点。

## 学习资源

- `docs/reactive-overview.md`：梳理 reactive 与 track/trigger 的核心流程。
- `docs/effect-overview.md`：总结 effect、scheduler 与 scope 相关的实现细节。
- `coverage/`：Vitest coverage 报告，可结合源码追踪依赖触发路径。

欢迎通过 `playground/` 改写组件或在 `test/` 中补充断言，以亲自验证响应式与 JSX 渲染机制。
