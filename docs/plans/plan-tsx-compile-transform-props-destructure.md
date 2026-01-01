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

[ ] P0：明确插件接口与默认策略：仅匹配显式 `SetupComponent` 标注的函数；仅处理顶层单字段 `const { foo } = <propsParam>`（无 alias/多字段）；支持开关与诊断级别配置。
[ ] P0：实现语法识别：在 TS/TSX AST 中定位 `SetupComponent` 初始化表达式，拿到 `props` 参数名，识别函数体顶层的目标解构声明并收集映射（propKey -> localName）。
[ ] P0：实现引用改写：遍历函数体（含 render 返回的闭包与嵌套函数），对“引用位置”的 `Identifier(localName)` 改写为 `propsParam.propKey`；同时实现作用域遮蔽判断，避免改写同名参数/局部变量声明与其引用。
[ ] P0：实现安全警告：检测 `watch(foo, ...)` / `toRef(foo)` 直接传入解构变量时输出 warning（仅 `this.warn()`，不自动改写）；检测对解构变量的写入（赋值/自增等）输出更高等级诊断（默认 error）。
[ ] P0：处理声明本身：将 `const { foo } = props` 从输出代码中移除（避免改写后出现未使用变量导致 lint 噪音），并保证格式/换行不破坏 TSX。
[ ] P0：接入编译期套件：将该能力作为 `miniVueCompilerPlugin` 的一个 feature 组合（不通过“插件调用插件 hook”的方式实现），并更新仓库内 `vite.config.ts` 用法示例。
[ ] P0：调整 CI 检查：修改 `scripts/check/props-destructure.ts` 为 info（保留定位输出，但不设置 `process.exitCode = 1`），并补充提示：启用编译期插件后该写法是安全的。
[ ] P0：补齐测试：新增 `test/vite-plugin/props-destructure.test.ts` 覆盖基础改写、作用域遮蔽、嵌套函数/渲染闭包、watch/toRef warning、禁写入诊断、未命中不改写等场景。
[ ] P0：验证链路：运行 `pnpm run test`、`pnpm run typecheck`、`pnpm run check`，确保既有插件与边界规则不受影响。

## Open questions

- 无（已确认：P0 先只支持 `const { foo } = props`；诊断信息只通过 Vite 插件 `this.warn()` 输出）。
