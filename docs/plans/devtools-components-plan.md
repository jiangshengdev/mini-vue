# Plan：启用 Vue Devtools 内置 Components（最小可用）

目标：让 Chrome Vue Devtools（扩展 `>= 7.3.0`）的内置 `Components` 面板能够识别并展示 mini-vue 的**组件名称树**，且在开发态使用过程中不崩溃。

## Status

- v1 已落地：组件树可见且不崩溃（dev-only），并已通过 `pnpm run ci`。
- v2 已落地（最小闭环）：组件树自动刷新 + setup state 展示（proxyRefs + raw）+ 收集侧去重（避免 `ref([]/{})` 同时出现 `reactive0/ref0`）。
- 实现笔记（含关键读取路径与最小字段清单）：`docs/plans/devtools-components-builtin-minimal-plan-v1.md`。

## Scope

- In:
  - 仅开发态：在检测到 `__VUE_DEVTOOLS_GLOBAL_HOOK__` 时启用（生产构建不接入 devtools）。
  - `Components` 面板可见：能看到根组件与子组件的层级树与名称（函数名）。
  - 稳定性优先：展开/切换/点击节点不触发 devtools 后端报错（必要时用空对象占位字段兜底）。
  - 组件树自动刷新：组件 mount/update/unmount 时增量通知 Devtools 刷新。
- Out:
  - 不做组件高亮、DOM 定位、源码跳转、时间线、事件追踪、性能标记。
  - 不做 state/props 的“正确展示”（仅保证不崩溃，不追求内容完整）。
  - 不做 `.displayName`、不做生产环境兼容。

## 方案概览（最小化）

Vue Devtools 扩展注入的 devtools-kit 会在收到 `app:init` 后自动启用内置 `components` inspector，并用 `ComponentWalker` 从 `appRecord.rootInstance` 递归遍历 `instance.subTree.children[].component` 来构建树。mini-vue 的最小策略是：

1. `app:init` 发射的 **app 对象**必须能让 devtools-kit 拿到真实 `rootInstance`（`app._instance` 或 `app._container._vnode.component`）。
2. mini-vue 的 **组件实例对象**需要具备 devtools-kit 遍历所需的最小字段（`uid/parent/root/appContext/subTree/vnode` 等），并补齐 `appContext.mixins` 避免 `mixins.length` 崩溃。

## Action items

- [x] 调研并锁定 devtools-kit 的最小字段访问路径：`createAppRecord()` 如何获取 root、`ComponentWalker` 读取哪些实例字段（仅列清单，不扩展能力）。

- [x] 选定 rootInstance 暴露方式（最小改动优先）：
  - 推荐：在渲染器根渲染时写入 `container._vnode = <root vnode>`（dev-only），并在 devtools 插件侧设置 `app._container = container` 后发 `app:init`。
  - 备选：直接设置 `app._instance = rootInstance`（仍需能拿到 rootInstance 引用）。

- [x] 规划并实现 `app` 的 Vue-like 字段（dev-only，占位且加注释说明仅用于 Devtools 读取）：至少包含 `_container/_component/config.globalProperties`，满足 `createAppRecord()` 的取根逻辑与命名逻辑。

- [x] 规划并实现组件实例的最小 Devtools 兼容字段（dev-only，占位且加注释说明仅用于 Devtools 读取）：
  - 树遍历必须：`uid/parent/root/subTree/appContext.app`。
  - 防崩溃必须：`appContext.mixins: []`，以及点击节点时会被读取的 `setupState/attrs/refs/devtoolsRawSetupState` 等空对象占位。
  - vnode 关联：确保 `instance.vnode` 可读（可映射到现有 `instance.virtualNode`）。

- [x] 调整 `MiniVueDevtoolsPlugin` 的 `app:init` 发射策略：从“shim app”切换为“真实 app + 真实 rootInstance 链路”，保证 `Components` 可构建真实树。

- [x] Playground 验证用例规划：准备一个 2–3 层组件嵌套示例（含至少 1 个条件分支），并记录手动验证步骤（打开 Devtools → Components → 能看到名称树、展开/点击不报错）。

- [x] 验证与回归标准：`pnpm run ci` 通过；开发态手动验证通过；不引入生产构建副作用（dev-only 守卫明确）。

## Next（v2）计划

目标：在保持 dev-only 的前提下，让 `Components` 面板在“点击节点后”的详情展示更接近 Vue3（仍以“不崩”为第一优先）。

- [x] 将 `instance.vnode` 映射到 `instance.virtualNode`（只读兼容），补齐 `key/props` 读取链路。
- [x] 兼容 mini-vue 响应式代理：补齐 Vue 私有标记（如 `__v_raw` / `__v_isRef`），让 devtools-kit 能正确 `toRaw/unref`，避免 structured clone 失败。
- [x] setup state 自动收集：在组件 `setup()` 执行期间，自动把创建的 `ref/reactive/computed` 挂到 `instance.devtoolsRawSetupState`（键名为 `ref0/reactive0/...`）。
- [x] setup state 展示对齐 Vue3：`instance.setupState` 使用 `proxyRefs`（Ref/Computed 直接展示 `.value`），`instance.devtoolsRawSetupState` 保留 raw（供类型识别与编辑定位）。
- [x] 收集侧去重：`ref([]/{})` 内部 reactive 化时暂停收集，避免 setup state 同时出现 `reactive0/ref0` 的“看起来重复”问题。
- [ ] 若仍存在 structured clone 失败：对 `instance.props/setupState` 等做只读快照兜底，并明确不支持编辑回写。
- [ ] 视需要补齐 `instance.proxy` 的最小替代（仅用于 computed 读取，不参与运行时语义）。
- [x] 若树刷新体验不足：补发 `component:added/updated/removed` 事件触发 devtools 侧刷新（仍不做完整事件/性能追踪）。

## Next（v3）计划

目标：在保持“最小版本 + 不崩”的前提下，补齐 `Components` 面板的交互安全性与回归保障。

- [ ] 只读标记：readonly computed / readonly ref 在 Devtools 中不可编辑，避免误写导致异常。
- [ ] 状态编辑回写：支持编辑 `ref.value` 与 `reactive` 字段（仅 dev-only；不承诺 Map/Set 等复杂结构）。
- [ ] 回归测试：在 `test/devtools/**` 注入 hook，覆盖“收集去重 / 自动刷新事件 / setup state 代理不崩”。

## Open questions

- v2 组件树刷新策略已确认：通过 `component:added/updated/removed` 自动刷新。
- v2 状态序列化策略已确认：优先对齐 Vue `__v_*` 标记（让 devtools-kit 自行 `toRaw/unref`）；若仍失败再加“只读快照”兜底。
- v2 setup state 命名策略已确认：不做变量名推导；仅收集 `setup()` 执行期间创建的状态，并用 `ref0/reactive0/...` 的默认键名展示（忽略非顶层/异步创建的状态）。
- v2 去重策略已确认：`ref([]/{})` 内部 reactive 化属于实现细节，不参与 setup state 收集。
