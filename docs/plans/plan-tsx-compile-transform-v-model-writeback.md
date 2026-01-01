# TSX 编译期改写：v-model 写回策略（P0/P1/P2）

## 背景

mini-vue 当前 TSX `v-model` 的运行时写回（`setModelValue`）仅支持 `Ref`，非 `Ref` 绑定目标在开发模式下会告警但不会写回，容易出现「UI 看起来能变，但数据不变」或「数据变了但下一次渲染回滚」的隐性问题。

本计划的目标是：在 TSX 编译期把 `v-model={...}` 直接展开为等价的受控 props，并生成写回闭包，从而：

- 在 TSX 里支持更贴近 Vue3 的“可写左值”绑定体验；
- 同时保留运行时 `v-model` 作为兜底（但兜底仍只接受 `Ref`）。

## 与 Vue3 官方实现的对齐点（写回链路）

> 官方模板的 `v-model` 写回本质是“编译期生成 assigner + 运行时指令触发它”，并不是运行时凭空推断如何写回任意表达式。

- 编译期：生成 `modelValue` + `onUpdate:modelValue` 的写回闭包（`compiler-core` 的 vModel transform）。
- DOM 编译期：对原生表单选择不同运行时指令（text/checkbox/radio/select/dynamic），并注入 `needRuntime`（`compiler-dom` 的 vModel transform）。
- 运行时：DOM 指令读取 `onUpdate:modelValue` 并在事件触发时调用它完成写回（`runtime-dom` 的 vModel 指令实现）。

mini-vue 的 TSX 写回策略应遵循同一原则：**写回能力由编译期决定并生成**，运行时仅负责消费标准化后的 props。

## 已确认决策（来自本计划 Open questions 的回答）

1. `v-model` 绑定目标必须是 `Ref`（运行时兜底能力保持该约束）。
2. 编译期采用“直接展开”为主：把 `v-model` 展开为 `modelValue + 'onUpdate:modelValue'` 并生成写回闭包（而不是仅把目标改写为 `toRef(...)`）。

## 语法与边界：动态 key / 深层路径如何分层支持

本节只讨论“编译期可支持的绑定表达式形态”，以 TS/TSX AST 为准；不涉及 modifiers、具名 v-model 等扩展语义。

### 基本定义

- **可写左值（assignable LVal）**：能出现在赋值表达式左侧的表达式（如 `a.b`、`a[b]`、`ref.value`）。
- **深层路径（deep path）**：连续的成员访问链（如 `a.b.c`、`a[b].c`）。
- **动态 key（dynamic key）**：成员访问中的 key 不是静态字面量（如 `a[key]`、`a[list[index]]`）。

### 推荐的分层原则

- **P0 只做“低风险、语义确定、无需复杂缓存/求值策略”的形态**。
- **P1 才引入动态 key**，并且必须定义“是否缓存 key/是否重复求值”的语义。
- **P2 才处理更复杂的 base 表达式与副作用控制**（避免重复求值导致行为变化）。

### P0：深层路径（静态链）优先，动态 key 先不做

进入 P0 的形态（建议）：

- `ref.value`（显式写回 `.value`）。
- `obj.foo`、`obj.foo.bar`（`PropertyAccessExpression` 链，且每段均为静态属性名）。
- `obj['foo']`、`obj['foo'].bar`（`ElementAccessExpression`，且 key 为字符串字面量）。

P0 不支持（直接跳过改写并给诊断）：

- 动态 key：`obj[key]`、`arr[index]`、`obj[list[i]]`。
- 可选链：`obj?.foo`、`obj?.[key]`（本质不可赋值，无法生成正确的写回闭包）。
- 非左值：`foo()`、`a + b`、`obj.foo()`、`(obj.foo)` 以外的复杂表达式。

P0 的诊断建议：

- 对“不支持但常见”的写法输出明确建议：改为显式 `computed({ get, set })` 或显式 `toRef`，或直接写 `modelValue` + `'onUpdate:modelValue'`。

### P1：引入动态 key（仍限制副作用与求值策略）

进入 P1 的形态（建议）：

- `obj[key]`、`arr[index]`、`obj[nested.key]` 等动态 `ElementAccessExpression`。

P1 必须先定清楚语义（否则容易出现“行为看似正确但边界错”的问题）：

- **是否缓存 key**：
  - 不缓存：写回闭包里直接用 `obj[key] = $event`，每次事件触发重新读取 `key`（语义更“实时”）。
  - 缓存：在 render 阶段生成 `const __k = key`，闭包里用 `obj[__k] = $event`（避免重复求值，但会“固定”到该次 render 产生的 handler 上；下一次 render 会生成新的 handler）。
- **是否允许 key/base 具有副作用**：
  - 建议先要求“无副作用”（如只允许 Identifier/MemberExpression/ElementAccess 组合），否则必须进入 P2 做单次求值与复用。

P1 不支持（继续跳过并诊断）：

- 带可选链的动态访问（仍不可赋值）。
- 明显具有副作用的 base/key（如 `getObj()[key]`、`obj[getKey()]`）。

### P2：更复杂的 base 表达式与“单次求值”保证

进入 P2 的形态（建议）：

- base 或 key 包含调用、`new`、自增等潜在副作用：`getObj().foo`、`obj[getKey()]`。
- 需要“只求值一次”的语义保证（避免改写后重复调用造成行为变化）。

P2 的实现约束需要在计划里明确（文档先定原则即可）：

- 对 base/key 生成临时变量，确保 render 阶段只求值一次，并在写回闭包中引用该临时变量。
- 明确“事件触发时读到的是哪一轮 render 的 base/key”（通常是最新 render 产物，因为 handler 会被 props patch 更新）。

仍不建议支持（明确永久不支持）：

- `a?.b` / `a?.[b]` 这类不可赋值左值（除非引入非常规语义，比如“存在才写回，否则忽略”，但这会偏离 Vue3 且容易隐藏 bug）。

## 产物形态（仅文档级约定）

### 组件 v-model

- 输入：`<Comp v-model={EXPR} />`
- 输出（概念形态）：把 `v-model` 展开为
  - `modelValue={READ(EXPR)}`
  - `...{{ 'onUpdate:modelValue': ($event) => WRITE(EXPR, $event) }}`

> 备注：由于 TSX attribute 语法无法直接写 `onUpdate:modelValue`，实际输出建议通过对象 spread 注入该 key。

### DOM 表单 v-model

- DOM 表单仍由 `runtime-dom` 消费 `v-model` 兜底是允许的；但编译期若选择展开，也应展开为 `value/checked` + `onInput/onChange`，避免依赖运行时对 `Ref` 的约束。

## 里程碑

### P0

- 只支持静态深层路径（`obj.foo.bar`、`obj['foo'].bar`、`ref.value`）。
- 直接展开并生成写回闭包。
- 不支持的形态输出清晰诊断与替代写法。

### P1

- 支持动态 key 的 `ElementAccessExpression`（`obj[key]`、`arr[index]`），并明确 key/base 的缓存与副作用策略。

### P2

- 支持复杂 base/key（含调用/副作用），引入“单次求值”与临时变量策略，稳定语义。

