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

## Action items

[ ] 调研并锁定接入路径：优先使用 `@vue/devtools-api`（v7.3+ 兼容 v6 plugin API）；若 `addCustomTab` 无法在非 Vue runtime 下工作，则回退为“直接与 `__VUE_DEVTOOLS_GLOBAL_HOOK__` 通信”的最小实现（仅用于让扩展识别到 app）。
[ ] 设计 `src/devtools/**` 目录结构：实现 `MiniVueDevtoolsPlugin`（对象式插件），并提供 `index.ts` 聚合导出以满足重导出约束。
[ ] 设计 devtools bridge：`getDevtoolsHook()`、`emitAppInit(appShim)`、`emitAppUnmount(appShim)`；要求幂等、hook 缺失时完全 no-op。
[ ] 设计并实现 app shim：定义 `MiniVueDevtoolsApp` 结构（name/version/appContext 等），列出需要的 “Vue-like 字段占位” 清单与注释模板，明确哪些字段可保持 `undefined`。
[ ] 插件接入点：在 `install(app)` 中包装 `app.mount/app.unmount`（或订阅内部 mount 信号）以触发 init/unmount，并在 `uninstall` 中恢复包装与清理（对齐现有插件注册表的清理策略）。
[ ] 自定义面板（SFC）：用 `addCustomTab({ view: { type: 'sfc', sfc } })` 注册 “Mini Vue” Tab，SFC 初期仅显示占位文案（可附带版本/环境信息）。
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
