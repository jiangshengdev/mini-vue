# 本仓库的 Copilot 指南

目的：帮助 AI 快速掌握 mini-vue 的响应式与 JSX 实现，缩短调研时间。

## 全局速览

- 技术栈：Vite 7（`pnpm overrides` 锁定 `rolldown-vite@7.2.2`）+ TypeScript + Vitest；`src/index.ts` 统一导出 `reactive`/`effect` 与 JSX API。
- Demo：`index.html` 注入 `src/demo/main.ts`，示例组件位于 `src/demo/App.tsx`、`Counter.tsx`，用于人工体验响应式 + JSX。
- 资源：公共文件放 `public/` 通过绝对路径引用，组件私有资源放 `src/` 内直接 import（见 `App.tsx` 同时引入 `/vite.svg` 与本地 svg）。

## 响应式内核

- `reactive.ts` 通过 `ReactiveCache` 复用 Proxy，并显式拒绝数组；必须通过缓存 API 生成代理以维持依赖一致性。
- `internals/baseHandlers.ts`：`get` 读值时 `track` 并对嵌套对象懒代理，`set` 用 `Object.is` 判等后 `trigger`；扩展新 handler 时不要跳过这套判等策略。
- `effect.ts`：`ReactiveEffect` 负责依赖清理与嵌套生命周期，`effect()` 会立刻 `run()` 并将子 effect 注册到父级 `registerCleanup` 中，避免手动 stop 遗漏。
- `internals/operations.ts`：`DepRegistry` 以 `WeakMap<object, Map<key, Dep>>` 维护依赖，并通过快照触发副作用；切换依赖前务必读取新字段以重建追踪。

## JSX 渲染栈

- `tsconfig` 设置 `jsx: react-jsx` 且 `jsxImportSource: '@'`，编译后的 `jsx/jsxs/jsxDEV` 调用来自 `src/jsx-runtime/`，记得保持文件导出一致。
- `jsx/vnode`：`createVNode` 会把 `props.children` 归一化到 `children` 数组并移除原字段；`normalizeChildren` 会跳过 `null/boolean` 并将未知类型转字符串。
- `renderer/render.ts` 每次渲染前直接 `container.textContent = ''` 后全量 `mountChild`，当前没有 diff/patch 流程；若新增增量更新需同步测试。
- `renderer/mount.ts`：组件 `type` 为函数时执行组件本身，`props.children` 会重新塞回 props；原生元素走 `applyProps`，数组 children 先写入 `DocumentFragment`。
- `renderer/props.ts`：支持 `ref` 回调、`class/className`、字符串或对象 `style`、`onXxx` 事件（会转为小写事件名），以及布尔属性（`true` 写空串、空值移除）。

## Demo 与测试

- Demo 的 `Counter.tsx` 展示了 `ref` 捕获真实 DOM + `reactive`/`effect` 协同的推荐范式，可作为绑定事件或直接写 DOM 的参考。
- Vitest：`vitest.config.ts` 复用 Vite 配置并设置 jsdom；`test/*.test.ts(x)` 覆盖 reactive 缓存、effect 嵌套、createApp 挂载、JSX 渲染等场景，新增功能时优先仿照现有断言风格。
- 常用命令：`pnpm dev`（demo HMR）、`pnpm test`（一次性 run，可用 `pnpm test effect.test.ts` 精准调试）、`pnpm build`（先 `tsc` 再 `vite build`）、`pnpm preview`、`pnpm lint`、`pnpm format`。

## 约定与配置

- 中文输出：文档、注释、机器人回复统一使用中文。
- 模块解析：必须写 `.ts` 扩展名并遵循 `@/*` 别名；`verbatimModuleSyntax` 下禁止虚构默认导入。
- 类型导入：类型和值必须拆成独立语句，统一使用 `import type { Foo } from './bar.ts'`；禁止在同一条导入中混合 `type` 与运行时代码。
- DOM 选择统一 `document.querySelector<T>()`；只有明确存在的节点才使用 `!` 断言（参考 `src/demo/main.ts`）。
- ESLint/TSLint 均允许 `_` 前缀形参表示刻意未用；新增与 Vue API 对齐的钩子时可利用该规则。

## 常见坑

- Reactive 仅支持普通对象：传入数组需要先实现配套 handler 与测试，当前会抛出 `reactive 目前仅支持普通对象（不含数组）`。
- 多次渲染：`render()` 会清空容器，调用者需自行保存旧状态或重新创建树。
- 依赖失效：忘记读取新增字段时 `effect` 不会追踪；确认通过读取建立依赖后再修改。
- 事件命名：`onClick` 会被转为小写 `click` 事件，若绑定原生自定义事件需遵循该小写规则。

若某部分仍不清晰，请告知具体段落，我会继续补充。
