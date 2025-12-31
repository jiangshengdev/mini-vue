# Plan：Vue Devtools 插件（mini-vue）

以“官方 Vue Devtools 扩展 + Plugins API”为目标，先做最小闭环：在开发态让扩展识别到 mini-vue，并展示一个自定义面板（SFC 视图，先放占位文案）。整体参考 Pinia 的“插件面板”体验，但不追求官方 `Components` 面板可用。

## Scope

- In: dev-only 全局 hook 握手（`__VUE_DEVTOOLS_GLOBAL_HOOK__`）、最小 `app:init/app:unmount` 发射、插件安装/卸载与清理、自定义 Tab（SFC 占位）、playground 接入与验证、最小回归测试与文档。
- Out: 兼容官方 `Components` 面板（组件树/状态/高亮）、完整 Vue3 内部字段对齐、生产环境默认启用、时间旅行调试（time-travel）。

## 设计要点

- **开发态启用**：所有 devtools 逻辑必须以 `__DEV__` 保护；生产构建应可被摇树，且不产生副作用。
- **先识别后扩展**：先确保扩展能识别到“一个 app”，再注册自定义 Tab；初期 Tab 仅显示占位文案与基础信息。
- **桥接层隔离**：devtools 适配代码集中在 `src/devtools/**`，避免在核心渲染/响应式路径里分散 hook 逻辑。
- **App shim（兼容读字段）**：为避免 Devtools 后端读取字段时报错，允许在 devtools 专用对象上增加少量 “Vue-like 字段占位”；但必须在代码处写明这些字段仅用于 Devtools 兼容，不参与运行时语义。

## 调研结论（基于 `~/GitHub/devtools` 最新代码）

- **Chrome 扩展会在所有页面注入 devtools backend**：`packages/chrome-extension/manifest.json` 的 `content_scripts` 会在 `document_start` 注入 `dist/prepare.js`（MAIN world），其源码 `packages/chrome-extension/src/prepare.ts` 会执行 `devtools.init()`，因此扩展安装后页面内始终存在 `__VUE_DEVTOOLS_GLOBAL_HOOK__`（由 devtools-kit 创建）。
- **Devtools 面板是否出现取决于 `hook.apps.length`**：`packages/chrome-extension/src/devtools-background.ts` 仅在 `window.__VUE_DEVTOOLS_GLOBAL_HOOK__` 存在且 `hook.Vue || hook.apps.length` 为真时创建 “Vue” 面板；mini-vue 需要让 `apps.length > 0`。
- **让扩展“识别到 app”的最小条件是发 `app:init`**：扩展注入的 devtools-kit backend 会监听 `app:init` 并把 app 推入 `hook.apps`（见 `packages/devtools-kit/src/core/index.ts`），因此 mini-vue 只需在 mount 后调用 `__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('app:init', appShim, version, types)` 即可触发识别。
- **`addCustomTab` 与 Vue runtime 解耦**：`packages/devtools-kit/src/ctx/state.ts` 的 `addCustomTab` 只是写入 `__VUE_DEVTOOLS_KIT_CUSTOM_TABS__` 并触发 state 更新；因此可以在 mini-vue 中通过动态 `import('@vue/devtools-api')` 调用 `addCustomTab` 注册 SFC 面板，不依赖真实 Vue runtime。

## Action items

[x] 调研并锁定接入路径：通过 `__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('app:init', ...)` 触发扩展识别；通过动态 `import('@vue/devtools-api')` 调用 `addCustomTab` 注册 SFC 面板（若动态 import 失败，再回退到直接写入 `__VUE_DEVTOOLS_KIT_CUSTOM_TABS__` 的兜底方案）。
[x] 设计 `src/devtools/**` 目录结构：实现 `MiniVueDevtoolsPlugin`（对象式插件），并提供 `index.ts` 聚合导出以满足重导出约束。
[x] 设计 devtools bridge：提供 `getDevtoolsHook()`、`emitAppInit(appShim)`、`emitAppUnmount(appShim)`；要求幂等、hook 缺失时完全 no-op（第一版落地在 `src/devtools/hook.ts`）。
[x] 设计并实现 app shim：提供最小 `MiniVueDevtoolsApp` 与 root instance shim，并用注释说明其仅用于 Devtools 读取兼容（第一版落地在 `src/devtools/app-shim.ts`）。
[x] 插件接入点：在 `install(app)` 中包装 `app.mount` 触发 init；在 `uninstall` 中恢复包装并触发 unmount（第一版落地在 `src/devtools/plugin.ts`）。
[x] 自定义面板（SFC）：注册 “Mini Vue” Tab，SFC 先显示占位文案（第一版通过写入 `__VUE_DEVTOOLS_KIT_CUSTOM_TABS__` 注册，落地在 `src/devtools/tab.ts`，后续可替换为 `@vue/devtools-api`）。
[ ] Playground 验证：在 `playground` 中开发态启用插件，并写明验证步骤（打开 Vue Devtools → 看到 “Mini Vue” 自定义 Tab）。
[ ] 测试：在 `test/devtools/**` 模拟注入 hook，断言 mount/unmount 事件与 Tab 注册调用；保证测试不依赖真实浏览器扩展运行。

## 已确认（原 Open questions）

- 插件默认随库导出：通过 `src/index.ts` 暴露给用户使用。
- 允许为了“不报错”给 app shim 增加少量 “Vue-like 字段占位”：必须写注释说明其仅用于 Devtools 读取兼容。
- 自定义面板使用 SFC 视图：优先走 `addCustomTab`，先显示占位文案，后续再扩展交互。
- 兼容范围锁定 Vue Devtools 扩展 `>= 7.3.0`：不向下兼容更旧版本。
- `@vue/devtools-api` 作为 `devDependency` 引入：运行时使用动态 `import()` 以避免生产构建引入不必要依赖。

## Open questions

- 无（关键决策已确认）。

## 已落地目录结构（第一版）

- `src/devtools/index.ts`：唯一跨文件重导出入口，面向 `src/index.ts` 聚合导出。
- `src/devtools/plugin.ts`：`MiniVueDevtoolsPlugin` 对象式插件（包装 `app.mount`，负责触发接入流程）。
- `src/devtools/hook.ts`：`__VUE_DEVTOOLS_GLOBAL_HOOK__` 获取与 `app:init/app:unmount` 发射封装。
- `src/devtools/tab.ts`：自定义 Tab 注册与占位 SFC 内容（当前通过写入 `__VUE_DEVTOOLS_KIT_CUSTOM_TABS__` 注册）。
- `src/devtools/app-shim.ts`：最小 app shim 与 root instance shim（用于让 Devtools 后端不报错并完成识别）。
