# AppContext 与应用级 provides 的稳定传播（方向 1）

> 目标：避免依赖 appContext “临时栈”导致的注入不稳定；让应用级 provides 始终通过组件树结构传播。

## API 使用边界（严格语义）

本仓库对 `provide`/`inject` 采用严格语义：它们依赖“当前组件实例”，因此**只能在组件 `setup()` 执行期间调用**。

- 组件内：使用 `provide(token, value)` 与 `inject(token)`
- 组件外（插件安装、路由安装、启动逻辑等）：使用 `app.provide(token, value)`

典型用法：

```ts
// 组件外（例如 app.use(plugin) 内）：写入应用级 provides
app.provide('k', 'v')

// 组件内（setup 期间）：读取
const value = inject<string>('k')
```

如果在组件外直接调用 `provide()` / `inject()`，运行期会抛错（提示“只能在组件 setup 期间调用”）。

## 背景问题

当前实现中：

- `createAppInstance().mount()` 会在调用根渲染前后设置/清理 appContext 栈。
- 组件更新由响应式 effect 的 scheduler 触发执行，更新路径并不会自动处于 appContext 栈内。
- `createComponentInstance()` 会尝试从 `parent.provides` 或 `getCurrentAppContext()?.provides` 选择一个作为 `provides` 的原型源。

这会导致一种结构性风险：**只要出现“创建实例时没有 parent、且当时不在 appContext 栈内”**，新实例就无法继承应用级 provides，进而 `inject()` / `useRouter()` 等在该路径失效。

## 方向 1：结构化传播 appContext（推荐）

核心思想与 Vue 3 官方一致：**appContext 是树的属性，不是线程局部变量。**

### 目标行为

- 每个组件实例拥有稳定字段 `appContext`。
- 根实例的 `appContext` 来自 app 挂载时的根 vnode（或 app 自身持有的 context）。
- 子实例的 `appContext` 永远来自 `parent.appContext`。
- `provides` 的原型链构建规则：
  - `instance.provides = Object.create(parent?.provides ?? instance.appContext.provides)`

这样即使在更新 effect、scheduler、微任务等任意执行环境中创建新子组件，只要它是从父组件渲染树结构创建出来的，就能继承到应用级 provides。

### 当前实现状态

本仓库已按该方向落地：根 vnode 挂载 `appContext`，渲染器透传到挂载上下文，组件实例稳定持有 `appContext`。

### 在本仓库中的落点建议（只做对齐描述）

- 组件实例结构：扩展 `ComponentInstance`（src/runtime-core/component/context.ts）增加 `appContext` 字段。
- 根 appContext 来源：
  - 推荐：根 virtualNode 持有 appContext（挂载时写入），实例创建时从 vnode 读取。
  - 备选：渲染器或挂载入口显式传入 appContext（不依赖全局栈）。
- 实例创建：在 `createComponentInstance`（src/runtime-core/component/instance.ts）里使用 `parent.appContext` 或 vnode.appContext 初始化。

### 与“appContext 栈”的关系

- appContext 栈仍可保留：用于组件树之外执行某些需要 app 上下文的回调（类似“runWithContext”语义）。
- 但组件树的注入继承不应依赖该栈是否存在。

## 如何验证方向 1 覆盖到了问题

建议用例（概念层面）：

- 在“更新期创建新子组件”的场景下，新子组件的 `inject(XXX)` 仍可读取到 `app.provide(XXX, value)`。
- 在“无 parent 的根入口”场景（如直接调用根级 render 的封装）也能通过 vnode/app 持有的 appContext 保证继承。

对应回归用例：

- `test/runtime-dom/provide-inject.test.tsx`：直接 `render(vnode, container)`，通过 `vnode.appContext.provides` 仍能 `inject()` 命中。
