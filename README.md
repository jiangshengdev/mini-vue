# Mini Vue

简化版 Vue 3 运行时，覆盖响应式、平台无关渲染器与 DOM 宿主 glue，并内建 JSX 支持，便于学习与实验。

## 特性

- 响应式：`reactive`/`ref`/`computed`/`watch`/`effectScope`，以 `ReactiveEffect` 与依赖桶驱动，错误经共享 error channel 统一上报。
- 渲染：`runtime-core/createRenderer` 平台无关，按容器缓存挂载句柄；`runtime-dom` 注入真实 DOM 原语并处理 props 归一化。
- JSX：`jsx-foundation` 提供 vnode 工厂，`jsx-runtime`/`jsx-dev-runtime` 支持 `h`/`jsx`/`jsxs`/`jsxDEV`，对外入口 `src/index.ts`。
- HMR：DOM 侧在 `runtime-dom/create-app.ts` 对接 Vite HMR，更新前卸载，更新后按上次容器重挂。

## 快速开始

```bash
pnpm install
pnpm play        # Vite 开发模式，演示在 playground
pnpm build       # tsdown 打包并生成 JSX shim
pnpm test        # Vitest + jsdom，无超时，setup 位于 test/setup.ts
pnpm lint        # oxlint + eslint；类型检查 pnpm typecheck；格式化 pnpm format
```

## 最小示例

```tsx
import { createApp, reactive, type SetupComponent } from '@/index.ts'

const Counter: SetupComponent = () => {
  const state = reactive({ count: 0 })
  return () => <button onClick={() => state.count++}>count is {state.count}</button>
}

createApp(Counter).mount('#app')
```

## 目录速览

- `src/reactivity/**`：effect、ref、watch、effect scope，实现依赖收集与清理。
- `src/runtime-core/**`：平台无关 renderer 与应用生命周期，禁止重复 mount。
- `src/runtime-dom/**`：DOM 原语与 props 打补丁（class 归一化、style 对象/字符串、事件名小写、ref 由挂载层处理）。
- `src/jsx-foundation/**` 与 `src/jsx-runtime/**`：JSX vnode 构建与运行时入口。
- `playground/**`：Vite 演示入口，参考 `playground/app.tsx`。
- `test/**`：Vitest 覆盖 reactivity、runtime-dom、jsx-runtime；按模块分文件。

## 开发约定

- TypeScript ESM，显式 `.ts` 导入，`moduleResolution: bundler`，`jsx: react-jsx`，`jsxImportSource: '@'`，别名 `@` -> `src`。
- 新增功能优先放在现有子目录，小而专注；DOM 细节放 `runtime-dom`，通用逻辑留 `runtime-core`。
- 扩展 DOM props 时同步完善 `patch-props.ts` 与 `test/runtime-dom/**`；包装用户回调时复用 `shared/runSilent` 或 `runThrowing`，确保错误经 `handleError` 路由。

## 许可证

MIT
