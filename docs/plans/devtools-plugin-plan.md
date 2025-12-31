# Plan：Vue Devtools 插件（mini-vue）

以“官方 Vue Devtools 扩展 + Plugins API”为目标，先做最小闭环：在开发态让扩展识别到 mini-vue，并展示一个自定义 Inspector（Pinia 风格的 State/About）。不追求官方 `Components` 面板可用。

## Scope

- In: dev-only 全局 hook 握手（`__VUE_DEVTOOLS_GLOBAL_HOOK__`）、最小 `app:init/app:unmount` 发射、插件安装/卸载与清理、自定义 Inspector（State/About 占位）、playground 接入与验证、最小回归测试与文档。
- Out: 兼容官方 `Components` 面板（组件树/状态/高亮）、完整 Vue3 内部字段对齐、生产环境默认启用、时间旅行调试（time-travel）。

## 设计要点

- **开发态启用**：所有 devtools 逻辑必须以 `__DEV__` 保护；生产构建应可被摇树，且不产生副作用。
- **先识别后扩展**：先确保扩展能识别到“一个 app”，再注册自定义 Inspector；若需要额外入口/独立页面，再启用 Custom Tab。
- **Chrome 扩展 CSP 限制**：Vue Devtools Chrome 扩展为 Manifest V3，默认 CSP 不允许 `unsafe-eval`；因此 `sfc` 视图（运行时编译依赖 `new Function`）会导致面板空白。最小可用阶段先用 `iframe` 视图占位，后续若上游提供无 eval 的 SFC 方案再切回。
- **单入口**：优先使用自定义 Inspector（类 Pinia 的 State/About）作为主要入口，避免重复的 Custom Tab 入口；Custom Tab 仅保留为可选扩展点。
- **桥接层隔离**：devtools 适配代码集中在 `src/devtools/**`，避免在核心渲染/响应式路径里分散 hook 逻辑。
- **App shim（兼容读字段）**：为避免 Devtools 后端读取字段时报错，允许在 devtools 专用对象上增加少量 “Vue-like 字段占位”；但必须在代码处写明这些字段仅用于 Devtools 兼容，不参与运行时语义。

## 调研结论（基于 `~/GitHub/devtools` 最新代码）

- **Chrome 扩展会在所有页面注入 devtools backend**：`packages/chrome-extension/manifest.json` 的 `content_scripts` 会在 `document_start` 注入 `dist/prepare.js`（MAIN world），其源码 `packages/chrome-extension/src/prepare.ts` 会执行 `devtools.init()`，因此扩展安装后页面内始终存在 `__VUE_DEVTOOLS_GLOBAL_HOOK__`（由 devtools-kit 创建）。
- **Devtools 面板是否出现取决于 `hook.apps.length`**：`packages/chrome-extension/src/devtools-background.ts` 仅在 `window.__VUE_DEVTOOLS_GLOBAL_HOOK__` 存在且 `hook.Vue || hook.apps.length` 为真时创建 “Vue” 面板；mini-vue 需要让 `apps.length > 0`。
- **让扩展“识别到 app”的最小条件是发 `app:init`**：扩展注入的 devtools-kit backend 会监听 `app:init` 并把 app 推入 `hook.apps`（见 `packages/devtools-kit/src/core/index.ts`），因此 mini-vue 只需在 mount 后调用 `__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('app:init', appShim, version, types)` 即可触发识别。
- **`addCustomTab` 与 Vue runtime 解耦**：`packages/devtools-kit/src/ctx/state.ts` 的 `addCustomTab` 只是写入 `__VUE_DEVTOOLS_KIT_CUSTOM_TABS__` 并触发 state 更新；因此可以在 mini-vue 中通过动态 `import('@vue/devtools-api')` 调用 `addCustomTab` 注册自定义 Tab，不依赖真实 Vue runtime（但当前默认不启用，避免重复入口）。
- **浏览器工具栏 popup 的“Vue 检测”依赖 `window.__VUE__`**：`packages/chrome-extension/src/detector.ts` 使用 `window.__VUE__` 判定 `vueDetected`；mini-vue 没有该标记，开发态可在 hook 存在时补一个最小占位以避免 popup 显示 “Vue.js not detected”。

## Action items

[x] 调研并锁定接入路径：通过 `__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('app:init', ...)` 触发扩展识别；通过 `devtools-plugin:setup` 注册自定义 Inspector（Pinia 风格）；Custom Tab 作为可选扩展点（默认不启用）。
[x] 设计 `src/devtools/**` 目录结构：实现 `MiniVueDevtoolsPlugin`（对象式插件），并提供 `index.ts` 聚合导出以满足重导出约束。
[x] 设计 devtools bridge：提供 `getDevtoolsHook()`、`emitAppInit(appShim)`、`emitAppUnmount(appShim)`；要求幂等、hook 缺失时完全 no-op（第一版落地在 `src/devtools/hook.ts`）。
[x] 设计并实现 app shim：提供最小 `MiniVueDevtoolsApp` 与 root instance shim，并用注释说明其仅用于 Devtools 读取兼容（第一版落地在 `src/devtools/app-shim.ts`）。
[x] 插件接入点：在 `install(app)` 中包装 `app.mount` 触发 init；在 `uninstall` 中恢复包装并触发 unmount（第一版落地在 `src/devtools/plugin.ts`）。
[x] 自定义 Inspector（类 Pinia）：注册 “Mini Vue” Inspector，并提供 State/About 占位实现（落地在 `src/devtools/inspector.ts`）。
[x] 自定义 Tab（可选/默认关闭）：已实现 `iframe` 占位版本（Chrome 扩展 MV3 下 `sfc` 视图会触发 CSP），代码保留在 `src/devtools/tab.ts` 作为后续扩展点，但默认不注册以避免重复入口。
[x] Playground 接入：在 `playground` 中开发态启用插件，并写明验证步骤（打开 Vue Devtools → 看到 “Mini Vue” Inspector → State/About 正常工作）。
[ ] 测试：在 `test/devtools/**` 模拟注入 hook，断言 mount/unmount 事件与 Inspector 注册调用；保证测试不依赖真实浏览器扩展运行。

## 已确认（原 Open questions）

- 插件默认随库导出：通过 `src/index.ts` 暴露给用户使用。
- 允许为了“不报错”给 app shim 增加少量 “Vue-like 字段占位”：必须写注释说明其仅用于 Devtools 读取兼容。
- 自定义面板优先走自定义 Inspector：与 Pinia 一致的交互方式，且不受 MV3 CSP 影响；Custom Tab 仅保留为可选扩展点。
- 兼容范围锁定 Vue Devtools 扩展 `>= 7.3.0`：不向下兼容更旧版本。
- `@vue/devtools-api` 作为 `devDependency` 引入：运行时使用动态 `import()` 以避免生产构建引入不必要依赖。

## Open questions

- 无（关键决策已确认）。

## 已落地目录结构（第一版）

- `src/devtools/index.ts`：唯一跨文件重导出入口，面向 `src/index.ts` 聚合导出。
- `src/devtools/plugin.ts`：`MiniVueDevtoolsPlugin` 对象式插件（包装 `app.mount`，负责触发接入流程）。
- `src/devtools/hook.ts`：`__VUE_DEVTOOLS_GLOBAL_HOOK__` 获取与 `app:init/app:unmount` 发射封装。
- `src/devtools/inspector.ts`：自定义 Inspector（State/About 占位，类 Pinia 的左侧树 + 右侧 state）。
- `src/devtools/tab.ts`：自定义 Tab 注册与占位内容（当前使用 `iframe` + `data:` URL，避免 Chrome 扩展 CSP；默认不注册，仅作为后续扩展点）。
- `src/devtools/app-shim.ts`：最小 app shim 与 root instance shim（用于让 Devtools 后端不报错并完成识别）。
