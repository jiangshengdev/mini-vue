# Plan

在 mini-vue 中引入一项编译期（Vite transform）能力：允许在 `SetupComponent` 的函数体顶层对 `props` 做解构，并在编译产物中把对解构变量的引用改写回 `props.xxx`，从而避免「setup 阶段解构导致 render/闭包捕获旧值」的问题。该能力仅对显式标注为 `SetupComponent` 的函数生效；CI 的 `props` 解构检查可降级为 info。

## Scope

- In:
  - 新增编译期改写插件（作为 `miniVueCompilerPlugin` 的一个 feature）；
  - 仅支持函数体顶层、单字段、无 alias 的形态：`const { foo } = props`（不做参数解构 `({ foo }) => {}`，不做多字段/alias 解构；这些进入下一步任务）；
  - 对 `watch(foo, ...)` / `toRef(foo)` 等易错用法只做 warning（不自动改写用户写法，诊断通过 Vite 插件 `this.warn()` 输出）；
  - 将现有 `scripts/check/props-destructure.ts` 从硬失败调整为 info（不再阻断 CI）。
- Out:
  - 支持 `<script setup>` / `defineProps` 宏；
  - 支持参数解构、默认值、rest、嵌套解构、multi-variable declaration 等更复杂形态；
  - 变更运行时 `props` 的响应式追踪语义（如需让 `watch(() => props.foo)` 真正随 props 变更触发，作为后续独立议题评估）。

## Action items

[x] P0：明确插件接口与默认策略：仅匹配显式 `SetupComponent` 标注的函数；仅处理顶层单字段 `const { foo } = <propsParam>`（无 alias/多字段）；支持开关与诊断级别配置。
[x] P0：实现语法识别：在 TS/TSX AST 中定位 `SetupComponent` 初始化表达式，拿到 `props` 参数名，识别函数体顶层的目标解构声明并收集映射（propKey -> localName）。
[x] P0：实现引用改写：遍历函数体（含 render 返回的闭包与嵌套函数），对“引用位置”的 `Identifier(localName)` 改写为 `propsParam.propKey`；同时实现作用域遮蔽判断，避免改写同名参数/局部变量声明与其引用。
[x] P0：实现安全警告：检测 `watch(foo, ...)` / `toRef(foo)` 直接传入解构变量时输出 warning（仅 `this.warn()`，不自动改写）；检测对解构变量的写入（赋值/自增等）输出更高等级诊断（默认 error）。
[x] P0：处理声明本身：将 `const { foo } = props` 从输出代码中移除（避免改写后出现未使用变量导致 lint 噪音），并保证格式/换行不破坏 TSX。
[x] P0：接入编译期套件：将该能力作为 `miniVueCompilerPlugin` 的一个 feature 组合（不通过“插件调用插件 hook”的方式实现），并更新仓库内 `vite.config.ts` 用法示例。
[x] P0：调整 CI 检查：修改 `scripts/check/props-destructure.ts` 为 info（保留定位输出，但不设置 `process.exitCode = 1`），并补充提示：启用编译期插件后该写法是安全的。
[x] P0：补齐测试：新增 `test/vite-plugin/props-destructure.test.ts` 覆盖基础改写、作用域遮蔽、嵌套函数/渲染闭包、watch/toRef warning、禁写入诊断、未命中不改写等场景。
[x] P0：验证链路：运行 `pnpm run test`、`pnpm run typecheck`、`pnpm run check`，确保既有插件与边界规则不受影响。

[x] P1（可选）：支持多字段解构：`const { foo, bar } = props`（同一解构声明收集多个绑定并统一改写引用）。
[x] P1（可选）：支持 alias 解构：`const { foo: bar } = props`（将 `bar` 改写为 `props.foo`，并处理局部遮蔽）。
[x] P1（可选）：扩大“顶层”的定义：允许在非嵌套函数但位于 block 内（如 `if/for`）的解构声明，或显式拒绝并输出 warning（避免用户误以为已支持）。
[x] P1（可选）：增强误用检测：识别 `watch as w` / `toRef as r` 等导入别名，并在 warning 中给出建议写法（例如 `watch(() => foo, ...)`）。
[x] P1（可选）：增强诊断可读性：在 `this.warn()` 中输出 `id:line:column`（从 TS `SourceFile` 计算位置），便于快速定位源码。
[ ] P1（可选）：扩展匹配形态：支持更多显式 `SetupComponent` 标注写法（例如 `export default`、`as/satisfies SetupComponent` 的不同组合），并补齐对应测试用例。

[x] P2（可选）：支持参数解构 `({ foo }) => {}`：重写函数参数为单一 `props` 标识符并复用同一套“引用改写”逻辑（需要额外处理默认参数与类型注解）。
[ ] P2（可选）：支持默认值：`const { foo = 1 } = props`（先限定仅支持字面量默认值或明确声明语义差异，再逐步扩展）。
[ ] P2（可选）：支持 rest：`const { foo, ...rest } = props`（需要引入运行时 helper 或生成 proxy 以保持对 rest 字段的读取仍可追踪）。
[x] P2（可选）：支持非 identifier 的 prop key：如 `const { 'foo.bar': fooBar } = props` / `const { ['foo']: foo } = props`（输出 `props['foo.bar']` 等访问表达式）。
[ ] P2（可选）：支持 multi-variable declaration：`const a = 1, { foo } = props, b = 2`（需要更稳健的源码改写与分号/逗号处理策略）。

[ ] P3（可选）：输出 source map（例如引入 `magic-string` 并声明为直接依赖，或实现最小映射），提升调试体验。
[ ] P3（可选）：补齐 Playground/浏览器验证：增加一个父子组件示例，验证“props 变更 → 解构引用处读到新值”与 warning 行为符合预期。
[ ] P3（可选）：文档化与迁移指引：在 docs 中补充推荐写法、已支持/未支持语法列表，以及如何通过 `miniVueCompilerPlugin` 开关此能力。

## Open questions

- 无（已确认：P0 先只支持 `const { foo } = props`；诊断信息只通过 Vite 插件 `this.warn()` 输出）。
