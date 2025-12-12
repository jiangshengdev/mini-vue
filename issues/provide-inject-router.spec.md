# Spec：Provide/Inject + Router 自动注入（对齐 vue-router 使用体验）

> 目标读者：后续接手实现的 LLM / 贡献者
>
> 关键词：`provide/inject`、`app.use()` 插件、`useRouter()`、`RouterLink/RouterView` 无需显式传 `router`

## 0. 背景与动机

当前 `src/router/components/router-link.tsx` 与 `src/router/components/router-view.tsx` 都要求 props 里显式传入 `router: Router`。

- 现状：playground 必须写 `router={router}`，例如 `playground/src/app.tsx`。
- 期望：使用体验接近官方 vue-router（Vue 3）：`<RouterLink to="/" />`、`<RouterView />`，不需要每个组件都手动传 `router`。
- 根因：mini-vue 当前 runtime-core 只有 `currentInstance`（仅 setup 阶段设置），缺少通用的依赖注入（provide/inject）与应用级上下文（app context）。

该能力也与 `issues/component-reactivity-plan.md` 中 “实例上下文尚未承载生命周期/依赖注入（待规划）” 的方向一致。

## 1. 目标（Goals）

1. 实现最小可用的 `provide` / `inject`（组合式 API），并能在组件树中按父子链路继承。
2. 实现最小应用上下文（app context）与插件安装入口：`app.use(plugin)`。
3. 为 router 提供标准注入方式：
   - 暴露 `useRouter()`（内部通过 `inject` 获取 router）。
   - `RouterLink` / `RouterView`：`router` props 变为**可选**，优先使用 props；未传时使用 `useRouter()`。
4. Playground 里移除 `router={router}` 传参，保证示例可运行。
5. 增加回归测试覆盖：
   - 注入生效（RouterView/RouterLink 无 props 仍可工作）
   - 未安装 router 时的错误路径（明确报错）

## 2. 非目标（Non-goals）

- 不实现完整的 Vue 插件体系（比如 mixins、全局属性、directive、component 注册）。
- 不实现复杂的 `provide/inject` 行为（如响应式解包、`inject` 的工厂 default、`treatDefaultAsFactory` 等 Vue 细节）；本阶段只做最小必要行为。
- 不引入新的渲染 patch/调度优化（与本 spec 无关）。

## 3. 约束（Constraints）

- TypeScript ESM，显式 `.ts` 导入，严格类型，避免隐式 `any`。
- 对外导出集中在 `src/index.ts`（新增公共 API 必须在此聚合导出）。
- 错误处理应尽可能走既有错误通道（`shared/error-handling.ts`）或至少保证错误信息清晰。
- 不增加无关的 UX、额外页面或“顺手优化”。

## 4. 用户视角 API 设计

### 4.1 应用层

新增（或扩展）`createApp()` 返回实例的能力：

- `app.use(plugin)`：安装插件（仅函数形式；router 将以插件形式安装）。
- （可选）`app.provide(key, value)`：允许在应用级提供依赖（root provides）。

### 4.2 组合式 API

新增导出：

- `provide(key, value)`：在当前组件实例上提供依赖。
- `inject(key, defaultValue?)`：从当前组件向上查找依赖；找不到时：
  - 有 `defaultValue` 则返回 default
  - 否则返回 `undefined`（或抛错，见“错误策略”）

### 4.3 Router

新增导出：

- `useRouter(): Router`：返回注入的 router；若未找到，抛错（错误信息明确提示需要 `app.use(router)` 或传入 `router` props）。

Router 需要具备插件形态（推荐）：

- 最简单：新增导出 `createRouterPlugin(router)`，返回 `(app) => app.provide(ROUTER_KEY, router)`。

## 5. 设计概览（Design Overview）

### 5.1 组件实例与 parent 链路

要让 `inject()` 正确工作，组件实例需要能访问父实例（或父 provides）。

建议改动：

- 在 `ComponentInstance` 增加：
  - `parent?: ComponentInstance`（或更宽泛的 AnyInstance）
  - `provides: Record<string | symbol, unknown>`（基于原型链继承）

- `provides` 初始为 `Object.create(parent?.provides ?? appContext.provides)`。

### 5.2 currentInstance 覆盖范围

当前 `currentInstance` 仅在 `setup()` 调用前后设置。

但子组件挂载发生在父组件 render 期间：父组件 `instance.render()` 返回子树，随后 `mountChildWithAnchor()` 才会创建/挂载子组件。

因此需要扩展：

- 在**渲染阶段**执行 `instance.render()` 之前设置 `currentInstance=parent`，并在 render 完成后恢复。

推荐落点：`src/runtime-core/component/render-effect.ts` 中 effect runner 内。

### 5.3 app context

建议在 runtime-core 创建一个最小 `AppContext`：

- `provides: PlainObject`

并让 `createAppInstance()` 维护它。

### 5.4 错误策略

- `provide()` 在没有 `currentInstance` 时调用：抛错（说明只能在 setup/render 期间使用）。
- `inject()` 找不到：返回 `defaultValue` 或 `undefined`。
- `useRouter()` 找不到：抛错（体验上比返回 `undefined` 更早暴露接入错误）。

## 6. 实现步骤（Implementation Plan）

> 每一步都应保持可编译，并尽量做到“改动最小、回归清晰”。

### Step 1：新增 app context 与插件入口【已完成】

1. 【已完成】在 runtime-core 引入最小 `AppContext` 数据结构。
2. 【已完成】扩展 `AppInstance`：增加 `use(plugin)` 与 `provide(key, value)`（插件仅函数形式）。
3. `createAppInstance()`：

- 【已完成】创建 appContext（包含 `provides`）。
- 【已完成】`use(plugin)` 直接调用 `plugin(app)`。

### Step 2：组件实例支持 parent/provides【已完成】

1. 【已完成】扩展 `ComponentInstance`：增加 `parent` 与 `provides`。
2. 【已完成】在挂载链路传递 `parent`（`mountChild`/`mountVirtualNode`/`mountComponent`）。
3. 【已完成】root 组件实例的 `provides` 从 appContext 继承（`Object.create(appContext.provides)`）。

### Step 3：扩展 currentInstance 覆盖到 render 阶段【未开始】

1. 【未开始】在 `render-effect` 中运行 `instance.render()` 前后：

- `setCurrentInstance(instance)`
- 调用 render
- `unsetCurrentInstance()`

2. 【未开始】确保 rerender 流程同样覆盖（scheduler 触发的 render 也需要 set/unset）。

### Step 4：实现 provide/inject API【已完成】

1. 【已完成】新增模块：`src/runtime-core/provide-inject.ts`。
2. 【已完成】实现 `provide(key, value)`：写入 `getCurrentInstance().provides[key] = value`。
3. 【已完成】实现 `inject(key, defaultValue?)`：从 `getCurrentInstance().provides` 读取（原型链自然向上）。
4. 【已完成】在 `src/runtime-core/index.ts` 与 `src/index.ts` 聚合导出。

### Step 5：Router 改造为可注入【已完成】

1. 【已完成】新增 `ROUTER_KEY` 放在 `src/router/core/injection.ts`。
2. 【已完成】新增 `createRouterPlugin(router)`：`(app) => app.provide(ROUTER_KEY, router)`。
3. 【已完成】新增 `useRouter()`：`inject(ROUTER_KEY)`，未命中则抛错。
4. 【已完成】修改 `RouterLinkProps` / `RouterViewProps`：`router?: Router`，并优先使用 props，否则 `useRouter()`。

### Step 6：Playground 接入【未开始】

1. 【未开始】`playground/src/main.ts`（或创建 app 的位置）执行 `app.use(createRouterPlugin(router))`。
2. 【未开始】`playground/src/app.tsx` 移除 `router={router}`。

### Step 7：测试与回归【已完成】

新增测试（推荐放在 `test/runtime-dom/`，因为 jsdom + createApp 更贴近真实使用）：

1. `RouterView`：安装 router 后，`<RouterView />` 能渲染当前路由组件。
2. `RouterLink`：安装 router 后，点击 `<RouterLink to="/x" />` 能触发 `router.navigate`（可通过 spy/mock 验证）。
3. 未安装 router：渲染 `<RouterView />` 或 `<RouterLink />` 时抛出明确错误。

## 7. 涉及文件（Files / Touch Points）

预计会修改/新增：

- runtime-core
  - `src/runtime-core/create-app.ts`（app context + use/provide）
  - `src/runtime-core/component/context.ts`（instance 增加 parent/provides）
  - `src/runtime-core/component/instance.ts`（创建实例时初始化 provides）
  - `src/runtime-core/component/mount.ts` / `anchor.ts`（传递 parent）
  - `src/runtime-core/component/render-effect.ts`（render 期间设置 currentInstance）
  - 新增：`src/runtime-core/api/provide-inject.ts`（或拆分 provide.ts / inject.ts）
- router
  - `src/router/core/create-router.ts`（install 能力）
  - 新增：`src/router/core/injection.ts`（`ROUTER_KEY` + `useRouter`）
  - `src/router/components/router-link.tsx`（router props 可选 + 注入）
  - `src/router/components/router-view.tsx`（router props 可选 + 注入）
- exports
  - `src/index.ts`（导出 provide/inject/useRouter 等）
- playground
  - `playground/src/app.tsx`（移除 router props）
  - `playground/src/main.ts`（或创建 app 的入口处：`app.use(router)`）
- tests
  - 新增：`test/runtime-dom/router-injection.test.tsx`（名称可调整）

## 8. 验收标准（Acceptance Criteria）

- Playground：`<RouterLink>` / `<RouterView>` 使用时无需传 `router` props 也能正常运行。
- 兼容性：原本显式传 `router={router}` 的写法仍能工作（优先 props）。
- 类型：TypeScript 严格通过；对外导出位于 `src/index.ts`。
- 测试：新增用例通过，至少覆盖注入成功与未安装错误。

## 9. 风险与注意事项（Risks / Notes）

- currentInstance 覆盖范围不够会导致子组件无法 `inject`：必须确保在父 render 期间设置 currentInstance。
- rerender 流程也要覆盖：不仅是首渲染，后续 effect rerender 的 render 也应设置 currentInstance。
- provides 的原型链方式简单但有效；注意避免直接替换 `provides` 导致链路断裂。
- 如果 `app.use`/`app.provide` 是 public API，记得同步类型导出并保持 DOM 包装层返回类型一致。

补充：

- 若 appContext 仅靠“全局栈”传播，更新期或根级直接 render 可能导致应用级 provides 丢失；建议采用结构化传播（见 `docs/app-context-provides.md`）。
