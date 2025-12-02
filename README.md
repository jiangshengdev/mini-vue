# Mini Vue

一个面向自学的 Vue 3 核心精简实现，覆盖响应式系统、JSX 渲染链路以及 jsdom 测试场景。项目基于 Vite 7 + TypeScript + Vitest，所有 API 由 `src/index.ts` 统一导出，方便在 Demo 与测试间共享。

## 特性亮点

- **响应式内核**：`reactive`、`effect`、`watch` 采用 `ReactiveCache` 复用代理，并包含依赖收集、清理与嵌套生命周期的完整实现。
- **JSX 渲染链路**：`runtime-core` 与 `runtime-dom` 解耦，renderer 通过宿主注入完成 vnode -> DOM 的挂载，暂不做 diff，易于调试。
- **DOM Demo**：`src/demo` 提供 `Counter` 等组件，结合 `pnpm dev` 可实时体验响应式 + JSX 交互。
- **可验证的学习路径**：`test/` 中的 Vitest 用例覆盖缓存策略、effect 嵌套、渲染与属性打补丁流程，配套 `docs/` Markdown 说明便于查阅。

## 项目结构

```text
mini-vue/
├─ src/
│  ├─ reactivity/        # 响应式核心（reactive、effect、watch、ref）
│  ├─ runtime-core/      # 平台无关 renderer 与组件实例
│  ├─ runtime-dom/       # DOM 宿主实现与 patchProps
│  ├─ jsx-runtime/       # JSX runtime & shared helper
│  └─ demo/              # App/Counter 示例及样式
├─ test/                 # Vitest 用例（jsdom 环境）
├─ docs/                 # 学习笔记与议题整理（VitePress）
└─ public/               # 静态资源，通过绝对路径引用
```

## 快速开始

1. 安装依赖（推荐 Node 18+ 与 pnpm 9）：
   ```bash
   pnpm install
   ```
2. 启动 Demo（默认 http://localhost:5173）：
   ```bash
   pnpm dev
   ```
3. 运行测试（单次 run，jsdom 环境）：
   ```bash
   pnpm test
   ```

## 常用脚本

- `pnpm build`：先 `tsc` 类型检查，再执行 Vite 产物构建。
- `pnpm preview`：在本地预览打包结果。
- `pnpm lint` / `pnpm format`：使用 ESLint + Prettier 校验与格式化 `src`、`test`、`docs`。
- `pnpm docs:dev` / `docs:build` / `docs:preview`：启动或构建 VitePress 文档站点。

## 学习资源

- `docs/component-reactivity-plan.md`：响应式规划与实现细节。
- `docs/runtime-core-issues.md`：运行时实现中的设计 trade-off 与待办。
- `coverage/`：Vitest coverage 报告，可结合源码追踪依赖触发路径。

欢迎通过 `src/demo` 改写组件或在 `test/` 中补充断言，以亲自验证响应式与 JSX 渲染机制。
