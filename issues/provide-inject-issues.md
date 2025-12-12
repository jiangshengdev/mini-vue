# Provide/Inject 与 Router 注入问题记录

## 1. App 级 provides 只在首次 mount 生效，后续更新可能丢失注入上下文（已修复）

- 位置：`src/runtime-core/create-app.ts`、`src/runtime-core/app-context.ts`、`src/runtime-core/component/instance.ts`
- 现状：`setCurrentAppContext()` 仅包裹首次 `mount()` 内的 `config.render(...)` 调用；而组件更新渲染通常由 effect 触发，不一定处于 appContext 栈内。
- 影响：更新过程中若创建了新的组件实例（例如条件渲染打开/动态子树出现），`createComponentInstance()` 读取到的 `getCurrentAppContext()` 可能为 `undefined`，导致实例 `provides` 无法继承应用级 `provides`，进而让 `inject()`/`useRouter()` 在更新路径上失效。
- 提示：需要保证每次进入根渲染/更新渲染链路时都能建立可追踪的 appContext（或以更稳定的方式向组件树传播应用级 provides）。

### 1.1 代码现状复盘（已确认）

- appContext 通过栈管理：`setCurrentAppContext(appContext)` / `unsetCurrentAppContext()` 仅在 `createAppInstance().mount()` 内包裹一次根渲染。
- 组件实例创建时的 provides 继承源：`parent?.provides ?? appContext?.provides ?? Object.create(null)`；其中 `parent.provides` 优先级最高。
- 组件更新由 render effect 的 scheduler 驱动（`rerenderComponent`），该路径未建立 appContext 栈。

### 1.2 为什么“更新时创建新组件”有时不受影响

- 目前挂载链路会把父组件实例沿 children/mount 过程向下传递（`parent`），因此更新期在父组件子树中创建的新子组件通常会命中 `parent?.provides`，不依赖 `getCurrentAppContext()`。
- 因此该问题更像是“存在结构性风险点”，但是否触发取决于是否走到了“无 parent 且无 appContext”的实例创建路径。

### 1.3 触发该问题的更精确条件

- 必要条件：某次 `createComponentInstance()` 执行时 `context.parent` 缺失（或被错误丢失），同时当前不处于 `setCurrentAppContext()` 包裹范围内。
- 典型高风险路径（示例）：直接调用根级渲染函数（如 `renderDomRoot`）在更新时反复 render，导致进入 `mountChild(options, vnode, container)` 的“根入口”，该入口没有 parent；若外层也没有 appContext 包裹，则 `getCurrentAppContext()` 为 `undefined`。

### 1.4 建议修复方向（优先：方向 1）

- 不依赖“全局 appContext 栈”作为唯一传播手段，改为结构化传播：让组件实例稳定持有 `appContext`（根从 app/vnode 获取，子从 parent 继承），并以此初始化 `provides` 的原型链。
- appContext 栈可以保留作为“组件外执行某些逻辑”的辅助机制，但不应成为组件树注入继承的基础。

### 1.5 实际修复（方向 1 已落地）

- 根 vnode 挂载 `appContext`，渲染器从 vnode 读取并通过 `MountContext.appContext` 向下透传，避免依赖“仅 mount 时存在的全局栈”。
- `ComponentInstance` 增加 `appContext` 字段；`createComponentInstance` 优先从 `parent.appContext` / `context.appContext` 获取，最后才回退到 `getCurrentAppContext()`。
- 修复了元素 children 挂载链路丢失上下文的问题：`mountElement -> mountChildren` 改为传递完整 `MountContext`。

涉及文件：

- `src/runtime-core/create-app.ts`
- `src/runtime-core/renderer.ts`
- `src/runtime-core/mount/context.ts`
- `src/runtime-core/mount/children.ts`
- `src/runtime-core/mount/element.ts`
- `src/runtime-core/component/context.ts`
- `src/runtime-core/component/instance.ts`

回归测试：

- `test/runtime-dom/provide-inject.test.tsx` 新增用例：直接 `render(vnode, container)` 且只通过 `vnode.appContext` 也能 `inject()` 命中。

## 2. router.install() 无条件 start，可能重复启动监听且缺少自动 stop 对应（已修复）

- 位置：`src/router/core/create-router.ts`
- 修复前：`install(app)` 会触发 `start()`，但与 `app.unmount()` 无自动对应的 `stop()`，导致卸载后仍保留 window 监听，存在资源泄漏风险。
- 修复后：
  - `install(app)` 对同一个 app 幂等（重复 `app.use(router)` 不重复安装）。
  - 仅在“首个 app 安装”时 `start()`；多个 app 共享同一 router 时只启动一次监听。
  - 在 `install(app)` 阶段包装 `app.unmount()`，当最后一个 app 卸载后自动 `stop()`，形成安装/卸载闭环。

回归测试：

- `test/runtime-dom/router-injection.test.tsx` 覆盖重复 install 与多 app 共享 router 的监听启停行为。

## 3. app.provide 接收 symbol 键，但 provides 容器类型可能不一致（待确认/待修复）

- 位置：`src/runtime-core/create-app.ts`、`src/runtime-core/component/context.ts`（`Provides = PlainObject`）、`src/router/core/injection.ts`（`routerInjectionKey: symbol`）
- 现状：`app.provide(key: PropertyKey, value)` 允许 `symbol`；但 `state.appContext.provides`/`instance.provides` 的类型基于 `PlainObject`，若其定义并非 `Record<PropertyKey, unknown>`，则类型系统与运行期能力可能不对齐。
- 影响：注入键采用 `symbol` 时，类型层面可能出现不安全的断言/不一致；若后续对 provides 的实现做了约束，也可能引入隐藏的兼容性问题。
- 提示：需要统一 provides 的键类型定义与存储结构，确保 `symbol`/`string` 都能稳定支持。

## 4. provide/inject 作为公共 API 导出，但运行期限制“仅 setup 可用”易触发异常（待确认/待修复）

- 位置：`src/runtime-core/provide-inject.ts`、`src/index.ts`
- 现状：`provide()`/`inject()` 在没有 `getCurrentInstance()` 时会直接抛错（"只能在组件 setup 期间调用"），同时它们被从 `src/index.ts` 对外导出。
- 影响：用户在插件安装（`app.use`）、路由安装（`router.install`）或其他非组件 setup 的路径上误用时会直接抛异常，导致应用初始化失败；该限制与“公共 API”直觉可能不一致。
- 提示：需要明确 API 设计边界（仅组件内可用 vs 支持应用级注入），并保证文档/实现一致。

## 5. Fragment 分支强制 needsAnchor=false，可能导致兄弟插入顺序不稳定（待修复）

- 位置：`src/runtime-core/mount/virtual-node.ts`
- 现状：当 `virtualNode.type === Fragment` 时，转发到 `mountChild` 时会把 `needsAnchor` 强制置为 `false`。
- 影响：在父层要求使用锚点来维持兄弟节点插入顺序的场景中，Fragment 可能吞掉锚点需求，进而导致插入顺序/边界处理不符合预期。
- 提示：需要保证 Fragment 展开 children 时不破坏父层对锚点与边界的约束。
