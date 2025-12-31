# Router 模块问题记录

## 1. `RouterLink` 截断 query/hash，导致新标签跳转路径不完整（状态：已解决）

- 位置：`src/router/components/router-link.tsx`
- 现状：`RouterLink` 渲染 `href` 时用 `normalizePath(to)`，会去掉 query/hash；`target="_blank"`/修饰键点击不会被拦截，浏览器直接使用截断后的 `href`。
- 解决：`RouterLink` 通过 `normalizePath(to) + getQueryAndHash(to)` 生成完整 `href`，在不拦截场景下仍能保留 query/hash；补充 `_blank` 场景断言 `href` 包含 query/hash 且默认导航仍由浏览器处理。

## 2. 测试通过 Mock 内部模块模拟 `inject`（状态：已解决）

- 位置：`test/router/core/error-cause.test.tsx`
- 修复：移除对 `@/runtime-core/index.ts` 的 mock，改为在组件 `setup()` 内调用 `useRouter()` 走真实注入路径，并通过 `setErrorHandler` 捕获错误以断言 message/cause。
- 收益：不再依赖 `runtime-core` 的模块结构，测试更接近真实调用链。

## 3. 未命中路由时 `RouterView` 未渲染 fallback 组件（状态：按设计）

- 位置：`src/router/components/router-view.tsx`
- 现状：`matchRoute` 命中 fallback 时已将 `matched` 设为 `[fallback]`，最外层 `RouterView` 会渲染兜底；仅当有嵌套 RouterView 且深度超出 `matched` 长度时才返回 `undefined`。
- 结论：根部兜底已生效，嵌套层空白是预期行为（未配置多级路由/fallback 时不渲染子级）。
- 备注：如需多级兜底，可显式配置嵌套路由并为每层提供 fallback。

## 4. 路由状态丢失 query/hash，currentRoute 与地址栏不一致（状态：已解决）

- 位置：`src/router/core/create-router.ts`
- 现状：`RouteLocation` 现已携带 `fullPath`/`query`/`hash`，`matchRoute`/`navigate`/初始化会读取完整 `pathname + search + hash`，匹配仍按规范化路径进行。
- 影响：`currentRoute` 与地址栏保持一致，组件可读取 query/hash，且不影响路径匹配。

## 5. 全局 WeakSet 误判多实例重复安装（状态：已解决）

- 位置：`src/router/core/create-router.ts`
- 现状：安装时仍用全局 `appsWithRouter` 阻止同一 app 同时挂载多个 router，但在 app `unmount` 时会同时清理该 WeakSet 记录，允许卸载后重新安装或切换 router。
- 影响：消除了卸载后无法再次安装的误判，保持“一个 app 同时只允许一个 router”的约束。
