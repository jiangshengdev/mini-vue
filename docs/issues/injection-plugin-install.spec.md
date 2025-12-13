# Spec：抽离 Injection 类型到 shared + 统一插件安装最小 App 能力（类型去重）

> 目标读者：后续接手实现的 LLM / 贡献者
>
> 关键词：`InjectionKey`、`InjectionToken`、`PluginInstallApp`、`router.install`、类型复用、向后兼容（re-export）

## 0. 背景与动机

当前仓库内存在“同一能力的类型重复定义”，典型出现在 router 插件安装路径：

- `src/router/core/create-router.ts` 内部定义了 `InstallableApp`（描述 `router.install(app)` 所需的最小能力）。
- `src/router/core/types.ts` 的 `Router.install` 参数又内联了一份等价结构（`unmount? + provide` 两个重载）。

重复类型带来的问题：

1. **维护风险**：未来 app 插件接口演进时，需要修改多处，容易漏改。
2. **依赖混乱**：router 为了表达最小能力，必须引入 runtime-core 的注入类型；同时又在 router 自己内部重复声明 app 形状。
3. **扩展受限**：未来若新增其它插件（非 router）也需要类似的“最小 install app 能力”，当前没有一个可复用的公共契约。

目标是在不破坏现有运行时代码分层的前提下：

- 将可复用、纯类型的抽象下沉到 `shared`。
- runtime-core 继续提供 `provide/inject` 的运行时实现。
- router 等上层模块复用 shared 类型，消除重复定义。

## 1. 目标（Goals）

1. **消除重复**：router 中不再同时存在两份 `install(app)` 形状定义。
2. **类型可复用**：为“插件安装最小 App 能力”提供一个 shared 层的公共类型（用于 router/未来插件）。
3. **避免循环依赖**：shared 不反向依赖 runtime-core。
4. **向后兼容**：外部仍可从 `src/index.ts` / `runtime-core/index.ts` 获得 `InjectionKey/InjectionToken`（类型层面不破坏现有 import）。

## 2. 非目标（Non-goals）

- 不改变 `provide/inject` 的运行时语义与行为。
- 不引入新的插件体系能力（例如全局组件、mixin、directive）。
- 不重写 router 功能逻辑（仅围绕类型与 install 契约去重）。

## 3. 约束（Constraints）

- TypeScript ESM，显式 `.ts` 导入，strict。
- 对外导出集中在 `src/index.ts`。
- shared 只承载通用能力，避免引入 runtime-core/router 语义耦合。

## 4. API / 类型设计

### 4.1 shared：注入类型（纯类型）

新增模块：`src/shared/injection.ts`

- `InjectionKey<T>`：品牌化的 `symbol`，用于类型安全关联
- `InjectionToken<T>`：`InjectionKey<T> | string`

> 说明：这里仅包含 type（以及 `declare const ...: unique symbol` 的品牌字段声明），不包含任何运行时函数。

### 4.2 shared：插件安装最小 App 能力

新增公共契约：`PluginInstallApp`

- `unmount?: () => void`
- `provide<T>(key: InjectionKey<T>, value: T): void`
- `provide(key: InjectionToken, value: unknown): void`

建议放置位置：`src/shared/plugin.ts`（或按偏好命名）

> 命名说明：
>
> - 用 `PluginInstallApp` 避免 router 语义；该契约面向“任何插件安装”。

### 4.3 runtime-core：继续导出注入类型（向后兼容）

`runtime-core` 仍然对外导出：

- `InjectionKey`
- `InjectionToken`

但其定义来源应改为 `shared/injection.ts`，即：

- `src/runtime-core/provide-inject.ts` 使用 `import type { InjectionKey, InjectionToken } from '@/shared/injection.ts'`
- 并 `export type { InjectionKey, InjectionToken } from '@/shared/injection.ts'`

### 4.4 router：install 参数类型去重

- `src/router/core/types.ts`：
  - `Router.install(app: PluginInstallApp): void`
  - 移除内联对象类型

- `src/router/core/create-router.ts`：
  - 删除本地 `interface InstallableApp`
  - 改为 `type InstallableApp = PluginInstallApp` 或直接使用 `PluginInstallApp`

> 可选（更强去重）：
>
> - `type InstallableApp = Parameters<Router['install']>[0]`
> - 让 `types.ts` 成为唯一真相；`create-router.ts` 不再显式 import `PluginInstallApp`。

## 5. 设计概览（Design Overview）

### 5.1 分层原则

- shared：只放跨模块通用、与平台无关的类型/工具
- runtime-core：运行时能力（`provide/inject` 实现）
- router：业务模块（路径匹配、history 同步、install 注入）

本调整的核心是把“纯类型”下沉到 shared，使 router/runtime-core 都能复用，而不会产生 shared → runtime-core 的依赖。

### 5.2 向后兼容策略（re-export）

为了避免大面积改动 import 路径：

- 保持 `src/runtime-core/index.ts` 继续 `export type { InjectionKey, InjectionToken } ...`
- 保持 `src/index.ts` 继续导出这两个类型

外部用户与内部模块都可以继续从原路径导入（仅内部实现来源变化）。

## 6. 实现步骤（Implementation Plan）

> 每一步都应保持可编译、可运行；优先小步提交（即使你不打算真的 git commit，也按这个节奏分段落地）。

### Step 1：新增 shared 注入类型

1. 新增 `src/shared/injection.ts`（只包含类型定义）。
2. 在 `src/shared/index.ts` 聚合导出 `InjectionKey/InjectionToken`（type export）。

### Step 2：runtime-core 改为复用 shared 的注入类型

1. 修改 `src/runtime-core/provide-inject.ts`：移除本地 `InjectionKey/InjectionToken` 定义。
2. 改为从 `@/shared/injection.ts` import type。
3. 确保 `src/runtime-core/index.ts` 与 `src/index.ts` 的 re-export 不变。

### Step 3：新增 shared 的 PluginInstallApp

1. 新增 `src/shared/plugin.ts`（或同层文件）：定义并导出 `PluginInstallApp`。
2. 在 `src/shared/index.ts` 聚合导出 `PluginInstallApp`。

### Step 4：router install 相关类型去重

1. 修改 `src/router/core/types.ts`：
   - `install(app: PluginInstallApp): void`
   - 删除内联对象类型与不必要的 import
2. 修改 `src/router/core/create-router.ts`：
   - 删除本地 `interface InstallableApp`
   - 复用 `PluginInstallApp` 或 `Parameters<Router['install']>[0]`

### Step 5：验证与回归

1. `pnpm typecheck`
2. `pnpm test`

## 7. 涉及文件（Files / Touch Points）

预计新增：

- `src/shared/injection.ts`
- `src/shared/plugin.ts`

预计修改：

- `src/shared/index.ts`
- `src/runtime-core/provide-inject.ts`
- `src/router/core/types.ts`
- `src/router/core/create-router.ts`

（视实际 import/export 调整，`src/runtime-core/index.ts` / `src/index.ts` 可能无需改动或仅小改。）

## 8. 验收标准（Acceptance Criteria）

- `src/router/core/create-router.ts` 不再定义 `InstallableApp`（或不再重复表达同一契约）。
- `src/router/core/types.ts` 中 `Router.install` 参数不再内联重复结构。
- `InjectionKey/InjectionToken` 的类型定义来源为 shared，但外部仍可从 `src/index.ts` / `runtime-core/index.ts` 导入。
- `pnpm typecheck` 与 `pnpm test` 通过。

## 9. 风险与注意事项（Risks / Notes）

- **循环依赖风险**：shared 不能引入 runtime-core；因此必须先把注入 token 的类型下沉到 shared，才能在 shared 里定义 `PluginInstallApp` 而不降级类型体验。
- **d.ts 兼容**：如果对外 API 报告/类型提取依赖导出路径，需要确认 re-export 后生成的类型引用路径是否可接受。
- **命名稳定性**：`PluginInstallApp` 属于 shared 公共类型，命名要尽量通用，避免未来改名造成破坏。
