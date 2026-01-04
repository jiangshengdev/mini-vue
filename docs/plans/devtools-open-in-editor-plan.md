# Plan：Devtools 打开源代码（Open in Editor）

目标：在开发态使用 **Chrome Vue Devtools 扩展**的 `Components` 面板时，为 mini-vue 的函数组件提供 `__file` 元信息，使 Devtools 显示“打开编辑器（Open in Editor）”按钮，并通过开发服务器的 `/__open-in-editor` 打开本地文件（不要求行列跳转）。

## 背景与现状

- Devtools 组件树节点的 `file` 字段来自 `instance.type.__file`（devtools-kit `ComponentWalker` 会读 `instance.type.__file || ''`）。
- mini-vue 当前已能让 `Components` 面板显示组件树，但不会自动注入 `__file`，因此 UI 侧 `v-if="activeTreeNodeFilePath"` 不成立，按钮不显示。
- Chrome 扩展面板点击“Open in Editor”后，会请求 `__open-in-editor?file=<path>`（由宿主 dev server 提供该路由，Vite 通常内置支持）。

## Scope

- In:
  - 仅开发态：不影响生产构建（插件 `apply: 'serve'` 或等价 dev-only 守卫）。
  - 面向 Chrome 扩展面板：走 `/__open-in-editor` HTTP 路由。
  - `__file` 默认使用项目相对路径（以 Vite `config.root` 为基准优先尝试）；若相对路径在目标环境下无法打开，则允许通过配置回退为绝对路径。
  - 只要求“打开文件”，不要求行列跳转（`line/column` 传 0 或省略）。
- Out:
  - 引入 SFC/模板编译或生成 source map。
  - 支持非 Vite 开发服务器的 `/__open-in-editor` 中间件方案（需要时单独开计划）。
  - 处理匿名/动态生成组件的源码推导（例如运行时闭包组件无稳定声明点）。
  - 不提供“零配置”的运行时兜底：外部项目需要接入编译期插件（`miniVueCompilerPlugin` 或等价能力）。

## 方案（优先级）

### 方案 A（优先）：Vite 编译期注入 `__file`（dev-only）

在 `src/vite-plugin/` 新增一个 dev-only transform 插件，基于 TypeScript AST 定位 `SetupComponent` 声明点并注入赋值语句：

- 识别 `import type { SetupComponent } from <importSource>`（默认 `@jiangshengdev/mini-vue`，仓库内调试可用 `@/index.ts`），记录 `SetupComponent` 的本地别名。
- 遍历 `.ts/.tsx` AST：
  - 命中 `const Foo: SetupComponent = ...` / `const Foo: SetupComponent<Props> = ...`（含函数体内声明，例如“组件内组件”）。
  - 在该 `VariableStatement` 末尾插入（保持缩进）：
    - `if (typeof Foo === 'function') Foo.__file ??= '<relative-path>'`
- `<relative-path>` 取 `stripQuery(id)` 后相对 `config.root` 的路径，并统一为 `/` 分隔符。

优点：不依赖 `jsxDEV` 的 source 参数，覆盖“嵌套声明组件”；与现有 `devtools-setup-state-names` 插件实现模式一致。

### 方案 B（备选）：运行时 `jsxDEV` source 注入

若确认当前开发态编译产物会调用 `jsxDEV(type, props, key, isStatic, source, self)` 且 `source.fileName` 可用，则在 `src/jsx-runtime/runtime.ts` 的 `jsxDEV` 入口对 `type` 做惰性写入：

- `if (__DEV__ && typeof type === 'function') type.__file ??= normalize(source.fileName)`

优点：实现简单；缺点：依赖构建链路是否真的走 `jsxDEV` 并提供 source。

## 验证标准

- 手动：
  - `pnpm run play` → 打开 Chrome Vue Devtools → `Components`。
  - 选中任意组件后出现“Open in Editor”图标；点击后编辑器能打开对应文件（至少文件级）。
- 自动化（回归）：
  - 为新增 Vite 插件补齐最小单测：给定一段 TSX 输入，断言输出包含 `__file` 注入且仅在 dev-only 生效。

## Action items

- [ ] 明确 `/__open-in-editor` 在当前 playground dev server 中是否可用：用最小请求（或通过 Vite overlay 点击）验证路由存在。
- [ ] 设计 `__file` 的相对路径基准：默认以 Vite `config.root` 为基准；若打开失败再评估切换为绝对路径或可配置前缀。
- [ ] 新增 Vite 插件：`src/vite-plugin/devtools-setup-component-file.ts`（命名可调整），实现 TS/TSX AST 扫描 + 赋值插入。
- [ ] 在 `src/vite-plugin/index.ts` 聚合开关（例如 `devtoolsSetupComponentFile?: false | Options`），并在仓库 `vite.config.ts` 中开启用于自测。
- [ ] 验证 Devtools UI：组件树节点 `file` 有值时按钮出现，点击触发 `/__open-in-editor` 请求。
- [ ] 新增测试：`test/vite-plugin/devtools-setup-component-file.test.ts` 覆盖典型声明与嵌套声明（至少 2 例）。
- [ ] 文档补充：在 `docs/plans/index.md` 登记本计划；必要时在相关 devtools 计划中追加交叉引用。

## Open questions

- （暂不保留）若后续遇到更多路径兼容性问题，再补充到本节。
