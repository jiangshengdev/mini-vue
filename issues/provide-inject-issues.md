# Provide/Inject 与 Router 注入问题记录

## 1. App 级 provides 只在首次 mount 生效，后续更新可能丢失注入上下文（待修复）

- 位置：`src/runtime-core/create-app.ts`、`src/runtime-core/app-context.ts`、`src/runtime-core/component/instance.ts`
- 现状：`setCurrentAppContext()` 仅包裹首次 `mount()` 内的 `config.render(...)` 调用；而组件更新渲染通常由 effect 触发，不一定处于 appContext 栈内。
- 影响：更新过程中若创建了新的组件实例（例如条件渲染打开/动态子树出现），`createComponentInstance()` 读取到的 `getCurrentAppContext()` 可能为 `undefined`，导致实例 `provides` 无法继承应用级 `provides`，进而让 `inject()`/`useRouter()` 在更新路径上失效。
- 提示：需要保证每次进入根渲染/更新渲染链路时都能建立可追踪的 appContext（或以更稳定的方式向组件树传播应用级 provides）。

## 2. router.install() 无条件 start，可能重复启动监听且缺少自动 stop 对应（待修复）

- 位置：`src/router/core/create-router.ts`
- 现状：`install(app)` 内部直接调用 `start()`，未防重复启动；同时路由器生命周期与 `app.unmount()` 没有自动对应的 `stop()`。
- 影响：用户手动 `start()` 或重复 `app.use(router)` 时可能重复注册事件监听；卸载应用后仍保留监听，存在行为异常或资源泄漏风险。
- 提示：需要明确 `start/stop` 的幂等语义，并在安装/卸载阶段形成闭环。

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
