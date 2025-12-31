# Plan：启用 Vue Devtools 内置 Components（最小可用 v1）

目标：让 Chrome 的 Vue Devtools 扩展（`>= 7.3.0`）在 mini-vue 的开发态页面中，`Components` 面板**能看到组件名称树**，且展开/切换/点击节点时**不崩溃**。

## 范围

- In（只做这些）：
  - 仅开发态启用：所有逻辑必须受 `__DEV__` 保护，生产构建不接入 devtools。
  - `Components` 树可见：展示根组件与子组件的层级与名称（函数名）。
  - 稳定性优先：`Components` 面板的交互不触发 devtools 后端报错（允许空对象占位字段兜底）。
- Out（明确不做）：
  - 不做 `.displayName`、不做生产环境支持。
  - 不做组件高亮、DOM 定位、源码跳转、时间线、事件追踪、性能标记。
  - 不做 props/state 的“正确展示”（只保证不崩溃）。
  - 不做 `component:added/updated/removed` 的增量同步与自动刷新。

## 接入路径（确定）

优先对齐 devtools-kit 的 Vue3 app 识别逻辑：

1. **发 `app:init` 让扩展识别到 app**
   - 通过页面内的 `__VUE_DEVTOOLS_GLOBAL_HOOK__`：`hook.emit('app:init', app, version, types)`。
   - `app` 传真实 mini-vue app（在 devtools 插件内给它补齐 Vue-like 字段：`_instance/_container/_component/config`）。
2. **让 devtools-kit 能取到 root instance**
   - devtools-kit 取根逻辑：`app._instance` 或 `app._container._vnode.component`。
   - mini-vue 在渲染器根渲染时（dev-only）写入 `container._vnode = <root vnode>`，以便插件侧取到 `container._vnode.component`。
3. **补齐最小字段，避免 devtools 读取崩溃**
   - `instance.appContext.mixins` 必须是数组，否则 `mixins.length` 会崩溃。
   - `instance.data/renderContext/setupState/attrs/refs/ctx` 必须是对象，否则组件 state 处理会崩溃。
   - `instance.root` 必须存在（非 root 实例也要有），否则 appRecord 推导会失败并影响组件树遍历。
4. **types 映射**
   - 传入 `types.Fragment/Text/Comment`，用于 Fragment 识别与根元素推导。

## 代码改动点（最小）

- `src/runtime-core/renderer.ts`
  - dev-only：在根渲染完成后写入/更新 `container._vnode`，卸载时清空。
- `src/runtime-core/component/instance.ts`
  - dev-only：为组件实例追加 devtools 兼容字段占位（如 `root/data/renderContext/setupState/...`）。
- `src/devtools/plugin.ts`
  - `mount` 后从 `container._vnode.component` 获取真实 rootInstance，并发 `app:init`。
  - dev-only：补齐 `app` 与 `appContext` 的 Vue-like 字段（仅用于 Devtools 读取）。
- `src/devtools/app-shim.ts`
  - 从“创建独立 shim app”切换为“基于真实 app/instance 补齐字段”的工具函数（仍保持仅用于 Devtools 读取的注释说明）。

## 验证标准

- 手动：`pnpm run play` → 打开 Vue Devtools → `Components` 面板能看到名称树；展开/点击不报错。
- CI：`pnpm run ci` 通过。

## Open questions

- 无（v1 只要求“树可见且不崩溃”，其余能力后续单独开计划）。
