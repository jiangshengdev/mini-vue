# 最小路由规划（独立子项目）

## 背景

- 目标：实现独立的最小路由子项目（参考 vue-router 角色），放置于 `src/router/**`；playground 仅作为调用方。
- 范围（当前阶段）：仅支持 history 模式；可直接使用 `src/index.ts` 导出的能力（无需强行与 DOM 解耦）；实现最小核心即可，HMR 暂不处理。
- 风格：参考 vue-router，提供自定义组件（如 `RouterView`、`RouterLink`）。

## 任务清单（含状态）

### 1. 方案选型 [done]

- 模式：仅支持 history（`popstate` + `pushState`），不做 hash fallback。
- 路由表：`RouteRecord = { path: string; component: Component }[]`，进入时构建 `Map<string, Component>`；提供 `fallback` 组件用于 404。
- 路径约定：统一使用前导 `/`，忽略大小写差异，去除结尾 `/`（根 `/` 例外）；query/params 暂不实现，留作可选增强。

### 2. 路由核心实现 [done]

- 新建 `src/router/index.ts`，依赖 reactivity，导出 `createRouter` 与类型 `RouteRecord`/`RouteLocation`/`Router`/`RouterConfig`。
- API：`createRouter({ history: 'history', routes, fallback })` → `{ currentRoute: Ref<RouteLocation>, navigate(path), start(), stop() }`，当前仅 history 模式。
- 路径解析：`normalizePath` 统一前导 `/`、去尾随 `/`、小写化，并剔除 query/hash。
- 监听：`start()` 绑定 `popstate`，`stop()` 解绑；内部防重入；`navigate` 使用 `pushState` 写入并同步 `currentRoute`。
- 未匹配路由直接落 `fallback` 组件。

### 3. Playground 接入（调用方） [done]

- `playground/main.ts` 使用 `createRouter` 创建 history 路由，routes 覆盖 `/` 与 `/counter`，`fallback` 提供 404 组件。
- 根组件 `Root` 读取 `router.currentRoute` 渲染对应组件；入口 `main.ts` 仅导入 `main.ts` 保持脚本路径不变。
- 导航通过 `navigate` 与浏览器 back/forward 同步（`router.start()` 已调用）；HMR 暂未处理。

### 4. 导航 UI（示例层） [done]

- 在 `playground/router-root.tsx` 定义布局组件（`RouterLink` + `RouterView`），`main.ts` 仅组装路由与根组件。
- 样式已抽离至 `playground/router.css`，基础样式保留在 `style.css`。
- 入口 `main.ts` 未变，保持脚本路径与 HTML 引用一致。

### 5. 路由组件（参考 vue-router） [done]

- 已提供 `RouterView`：读取 `router.currentRoute` 渲染匹配组件（`jsx` 调用）。
- 已提供 `RouterLink`：接受 `to` 与 `router`，阻止默认跳转后调用 `navigate`，渲染 `<a>` 并支持透传其余 props。
- 组件与类型从 `src/router/index.ts` 导出，并在 `src/index.ts` 聚合导出。

### 6. 回归验证 [todo]

- 覆盖初始渲染、`popstate` 触发重渲染、未知路径落 404 的行为。
- 验证基础导航（`navigate`、`RouterLink`）可用，history 回退前进可驱动视图更新。
- HMR 暂不验证；记录未来需要补测的点。

### 7. 可选增强 [todo]

- 路由参数与 query 解析：提供轻量 parse/serialize。
- 导航钩子：`beforeNavigate` 用于拦截或埋点，默认关闭。
- 活跃状态支持：`RouterLink` active class/aria（可选）。
