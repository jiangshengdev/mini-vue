# v-model 组件支持计划（与 DOM 解耦）

在现有 JSX `v-model`（原生表单受控属性 + 事件）的基础上，补齐“组件 `v-model`”能力：让 `<MyComp v-model={state} />` 在运行时自动转换为 Vue3 对齐的组件通用协议（默认 `modelValue` + `onUpdate:modelValue`）。

同时为非 DOM 宿主铺路：尽早把“DOM 表单适配”从 `jsx-runtime` 抽离到宿主层（优先落在 `runtime-dom`），避免 `jsx-runtime` 隐式依赖 DOM 事件/元素语义，阻碍跨宿主渲染器。

## Scope

- In:
  - 组件 `v-model`：把 `'v-model'` 转换为 `modelValue` + `onUpdate:modelValue`（写入走 `setModelValue`）。
  - 非 DOM 宿主支持：将 DOM 表单 `v-model` 适配从 `jsx-runtime` 抽离到 `runtime-dom`，让平台无关层不再承担 DOM 语义。
  - 类型声明与测试覆盖：`src/jsx-shim.d.ts` + `test/jsx-runtime/**`。
- Out:
  - 完整对齐 Vue3 的所有 `v-model` 细节（多 model 全量、修饰符全量、`true-value/false-value`、编译期指令系统等）。
  - 具名 `v-model`（明确不支持）。
  - modifiers（明确不支持，包括 `trim/number`）。

## Action items

- [ ] 明确并文档化 `v-model` 绑定目标规范：支持 `Ref`/只读目标告警等，统一复用 `readModelValue`/`setModelValue`（`src/jsx-runtime/transform/v-model/model.ts`）。
- [ ] 在 `transformModelBindingProps` 增加组件分支：当 `type` 为组件时，将 `'v-model'` 转为 `modelValue` + `onUpdate:modelValue` 并移除原字段，同时做冲突检测与 Dev 告警（`src/jsx-runtime/transform/v-model/transform.ts`）。
- [ ] 拆分 `v-model` 转换层级：
  - [ ] 平台无关：组件 `v-model`（保留在 `jsx-runtime` 或更底层）。
  - [ ] DOM 宿主：表单元素 `v-model`（迁移到 `runtime-dom`，与 `props` patching 贴近）。
- [ ] 迁移 DOM 表单 `v-model` 的落点方案（二选一，优先 A）：
  - [ ] A：在 `runtime-dom/props` 中识别并消费 `v-model`（不再要求 `jsx-runtime` 预先改写为 `value/checked + onXxx`）。
  - [ ] B：由 `runtime-dom` 在创建应用/渲染器时注入一段 props transform pipeline（让 `jsx-runtime` 可保持平台无关）。
- [ ] 更新类型：在 `src/jsx-shim.d.ts` 中补齐组件 `v-model`、以及 `onUpdate:modelValue` 的事件签名提示（先宽松、后续再逐步收紧）。
- [ ] 补测试：覆盖组件 v-model 的 props 产物形态、Ref 写入、只读目标告警、冲突属性覆盖告警等（`test/jsx-runtime/**`）。
- [ ] 更新文档与 Playground：补一个最小组件 v-model 示例，并写清与 DOM v-model 的差异与限制（`README.md` / `docs/**` / `playground/**`）。

## Open questions

- 组件 `v-model` 冲突覆盖策略：当用户显式传入 `modelValue`/`onUpdate:modelValue` 时，是否与 DOM v-model 一样发出 Dev 告警并覆盖？
- DOM 表单 `v-model` 迁移到 `runtime-dom` 后，是否需要保持“第三方产物兜底”（即仍允许 `jsx-runtime` 层转换作为兼容）？
