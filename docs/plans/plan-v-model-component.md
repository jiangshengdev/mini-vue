# v-model 组件支持计划（JSX 运行时）

在现有 JSX `v-model`（原生表单受控属性 + 事件）的基础上，补齐“组件 `v-model`”能力：让 `<MyComp v-model={state} />` 在运行时自动转换为组件通用协议（`modelValue` + `onUpdate:modelValue`），并为后续扩展多 model / modifiers 留出结构。

同时避免 DOM 细节继续膨胀到 `jsx-runtime` 的“通用层”里：把 `v-model` 划分为「组件通用协议」与「DOM 表单适配」两层，实现可演进的边界。

## Scope

- In:
  - 组件 `v-model`：把 `'v-model'` 转换为 `modelValue` + `onUpdate:modelValue`（写入走 `setModelValue`）。
  - 具名 `v-model` 设计：优先用对象形态表达，避免 JSX 属性名语法限制（如 `v-model={{ value, prop: 'foo' }}` → `foo` + `onUpdate:foo`）。
  - modifiers 透传与最小实现：组件侧按约定透传 `modelModifiers/fooModifiers`；DOM 侧按需补 `trim/number`（其余后续迭代）。
  - 类型声明与测试覆盖：`src/jsx-shim.d.ts` + `test/jsx-runtime/**`。
- Out:
  - 完整对齐 Vue3 的所有 `v-model` 细节（多 model 全量、修饰符全量、`true-value/false-value`、编译期指令系统等）。
  - 对所有非 DOM 宿主的通用表单行为一次性做完（先以最小可用 + 可扩展为目标）。

## Action items

- [ ] 明确并文档化 `v-model` 绑定目标规范：支持 `Ref`/只读目标告警等，统一复用 `readModelValue`/`setModelValue`（`src/jsx-runtime/transform/v-model/model.ts`）。
- [ ] 在 `transformModelBindingProps` 增加组件分支：当 `type` 为组件时，将 `'v-model'` 转为 `modelValue` + `onUpdate:modelValue` 并移除原字段，同时做冲突检测与 Dev 告警（`src/jsx-runtime/transform/v-model/transform.ts`）。
- [ ] 设计并实现具名 `v-model`：推荐对象形态（如 `v-model={{ value, prop: 'foo' }}`），产物为 `foo` + `onUpdate:foo`；评估是否支持 JSX namespaced 语法作为补充（`v-model:foo`）并给出取舍说明。
- [ ] 设计 modifiers 方案并落地最小闭环：组件侧透传（`modelModifiers`/`fooModifiers`）；DOM 侧可选实现 `trim/number`，并明确行为与边界。
- [ ] 评估并收敛 DOM 依赖的扩散：避免在“组件通用协议”路径里引入 `HTMLInputElement` 等 DOM 类型；必要时将 DOM 表单适配下沉到 `runtime-dom` 或隔离为独立适配层。
- [ ] 更新类型：在 `src/jsx-shim.d.ts` 中补齐组件 `v-model`、具名 v-model、以及 `onUpdate:*` 的事件签名提示（先宽松、后续再逐步收紧）。
- [ ] 补测试：覆盖组件 v-model 的 props 产物形态、Ref 写入、只读目标告警、冲突属性覆盖告警等（`test/jsx-runtime/**`）。
- [ ] 更新文档与 Playground：补一个最小组件 v-model 示例，并写清与 DOM v-model 的差异与限制（`README.md` / `docs/**` / `playground/**`）。

## Open questions

- 组件 `v-model` 是否严格对齐 Vue3：默认 `modelValue` + `onUpdate:modelValue`（而不是 `value`/`onInput`）？
- 具名 `v-model` 的用户态语法你更倾向：对象形态（推荐）还是同时支持 `v-model:foo`（若 TSX 解析可行）？
- 是否计划支持非 DOM 宿主渲染器？如果会，DOM 表单适配应尽早从 `jsx-runtime` 抽离到宿主层。

