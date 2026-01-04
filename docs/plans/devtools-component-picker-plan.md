# Plan：Devtools 组件点选（Component Picker）

目标：在开发态支持 Vue Devtools 的“点击页面元素选中组件”能力：进入选取模式后，点击页面任意组件渲染出来的 DOM，Devtools 能定位到对应组件实例，并在 `Components` 面板完成选中/高亮。

## Status

- 当前阶段：仅完成评估与计划整理，暂不开始实现。

## Scope

- In:
  - dev-only：所有逻辑必须受 `__DEV__` 保护。
  - hook-only：仅在检测到 `__VUE_DEVTOOLS_GLOBAL_HOOK__` 存在时启用，避免纯开发态额外开销。
  - 同步写入 DOM 标记：为宿主节点写入 `__vueParentComponent` 与 `__vnode`，覆盖 Devtools/Inspector 读取链路。
  - `app:init` 后全量回填：在 `app:init` 完成后补一次组件树遍历/回填，确保 `instanceMap` 完整（即使用户未打开 `Components` 树也能点选成功）。
- Out:
  - 生产环境支持。
  - 自定义 overlay 样式/高级交互（复用 Devtools 自身的高亮实现）。
  - 源码跳转、时间线、性能面板等扩展能力。

## 参考实现（devtools）

- 组件点选入口：`/Users/jiangsheng/GitHub/devtools/packages/devtools-kit/src/ctx/api.ts` → `inspectComponentHighLighter()`
- 选取模式核心逻辑：`/Users/jiangsheng/GitHub/devtools/packages/devtools-kit/src/core/component-highlighter/index.ts`
  - 从 `MouseEvent.target.__vueParentComponent` 取得组件实例
  - 通过 `getUniqueComponentId(instance)` 生成选中 id，并返回 `JSON.stringify({ id })`
  - 高亮范围依赖 `instance.vnode.el` 与 `instance.subTree.el/children/component`
- `instanceMap` 依赖：`/Users/jiangsheng/GitHub/devtools/packages/devtools-kit/src/core/plugin/components.ts`
  - `component:added/updated/removed` 事件会写入 `appRecord.instanceMap`
  - 若 `instanceMap` 未填充，`Components` 面板的 state/选中会找不到实例

## mini-vue 现状评估（关键结论）

- 已具备 Components 面板最小字段与生命周期事件：
  - `src/runtime-core/component/instance.ts` 已补齐实例字段占位与 `instance.vnode` 只读映射。
  - `src/runtime-core/component/render-effect.ts` / `src/runtime-core/component/teardown.ts` 已发射 `component:added/updated/removed`（受 `hasDevtoolsAppRecord()` 限制）。
  - `src/devtools/app-shim.ts` / `src/devtools/plugin.ts` 已发射 `app:init`，并为 `appContext.app/mixins` 等字段兜底。
- 缺口：
  - DOM 节点上尚未写入 `__vueParentComponent`，Devtools 选取模式无法从事件 target 反查组件实例。
  - DOM 节点上尚未写入 `__vnode`，后续 Inspector/生态工具的读取链路覆盖不足。
  - `app:init` 前的首屏 mount 阶段事件被跳过，`instanceMap` 可能不完整；需要 `app:init` 后补一次全量回填，确保点选稳定。

## 方案概览（最小化）

1. **dev-only + hook-only 守卫**
   - 在写入 DOM 标记与回填逻辑前先检测 `__VUE_DEVTOOLS_GLOBAL_HOOK__` 存在且 `emit` 为函数。

2. **为宿主节点写入 Devtools 标记**
   - 写入字段：
     - `node.__vueParentComponent = <拥有该节点的组件实例>`
     - `node.__vnode = <对应的 runtime vnode>`
   - 写入时机：
     - mount：创建并插入宿主节点后写入
     - patch：复用宿主节点时更新 `__vnode`，并按需刷新 `__vueParentComponent`

3. **`app:init` 后全量回填 instanceMap**
   - 在 `app:init` 之后（已拿到 `appRecord`）从 `rootInstance` 开始遍历组件树：
     - 遍历依据与 devtools-kit `ComponentWalker` 保持一致：`instance.subTree.component` 与 `subTree.children[].component`
   - 对遍历到的实例发射 `component:added`（或按需 `component:updated`），触发 devtools-kit 填充 `instanceMap` 与刷新树

## Action items

- [ ] 明确 DOM 标记写入位置与边界：优先放 `runtime-core`（mount/patch）还是放 `runtime-dom`（DOM 宿主层）？确保不污染非 DOM 宿主。
- [ ] 设计 hook-only 判定：复用现有 `getVueDevtoolsGlobalHook()` 还是在 shared 提供轻量 `hasVueDevtoolsHook()`。
- [ ] 规划并实现 mount 写入点：元素/Text/Comment/Fragment 锚点各自是否需要写入（按 devtools 行为取最小集合）。
- [ ] 规划并实现 patch 更新点：复用宿主节点时确保 `__vnode` 不指向旧 vnode。
- [ ] 规划 `app:init` 后回填算法：遍历策略、去重策略（基于 `instance.uid` 或引用）、父子关系推导。
- [ ] 回填触发策略：在 `MiniVueDevtoolsPlugin` 的 `app:init` 之后立即回填，或延迟到首个 `Components` 请求时回填（两者取其一并说明原因）。
- [ ] 验证标准（手动）：`pnpm run play` → Devtools → “选取组件” → 点击页面元素 → `Components` 面板选中对应组件且高亮正常。
- [ ] 回归测试计划：在 `test/runtime-dom/**` 用 jsdom 断言 `__vueParentComponent/__vnode` 写入与更新；在 `test/devtools/**` 模拟 hook 断言回填触发与事件发射。

## Open questions

- `__vnode` 在 mini-vue 中应挂载为 `RuntimeVirtualNode` 还是 `NormalizedVirtualNode`（需兼顾 patch 复用与 Devtools 读取预期）。
  - 建议：挂载为“当前渲染使用的 runtime vnode 对象”（语义更接近 `RuntimeVirtualNode`，实际对象可同时满足 `RuntimeVirtualNode & NormalizedVirtualNode`），并在 patch 复用宿主节点时把 `node.__vnode` 更新为最新 vnode，避免 Devtools 读到旧 `props/children`。
- 点选目标是 `Element` 为主：是否需要为 `Text/Comment` 节点也写入 `__vueParentComponent` 以覆盖极端事件 target？
  - 建议：需要。Devtools picker 直接读取 `e.target.__vueParentComponent` 且不会向上查找；为 `Element/Text/Comment`（含 Fragment 边界注释）统一写入能显著提高命中率，并覆盖“组件根为 Text/空渲染 Comment”这类极端输出。
