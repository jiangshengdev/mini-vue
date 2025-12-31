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

- [x] 明确并文档化 `v-model` 绑定目标规范：以 `Ref` 为主要绑定目标；非 `Ref` 目标仅在 Dev 下告警且不写回（待设计项见 `docs/issues/jsx-runtime-issues.md`）。统一复用 `readModelValue`/`setModelValue`（`src/jsx-runtime/transform/v-model/model.ts`）。
- [x] 在 `transformModelBindingProps` 增加组件分支：当 `type` 为组件时，将 `'v-model'` 转为 `modelValue` + `onUpdate:modelValue` 并移除原字段，同时做冲突检测与 Dev 告警（`src/jsx-runtime/transform/v-model/transform.ts`）。
- [x] 拆分 `v-model` 转换层级：
  - [x] 平台无关：组件 `v-model`（保留在 `jsx-runtime` 或更底层）。
  - [x] DOM 宿主：表单元素 `v-model`（迁移到 `runtime-dom`，与 `props` patching 贴近）。
- [x] 在 `runtime-dom/props` 中识别并消费 DOM 表单 `v-model`（保证只要使用 `runtime-dom`，不管 JSX 还是手写 `h` 都能生效）。
- [x] 迁移完成后，从 `jsx-runtime` 移除 DOM 表单 `v-model` 转换（但会触发一次读取以建立依赖，确保 `Ref` 变更能驱动更新）。
- [x] 更新类型：在 `src/jsx-shim.d.ts` 中补齐组件/表单 `'v-model'`（绑定目标为 `Ref`），并通过 `LibraryManagedAttributes` 合并到组件 props 校验链。
- [x] 补测试：覆盖组件 v-model 的 props 产物形态、Ref 写入、冲突属性覆盖告警等（`test/jsx-runtime/v-model-component.test.tsx`）。
- [ ] 更新文档与 Playground：补一个最小组件 v-model 示例，并写清与 DOM v-model 的差异与限制（`README.md` / `docs/**` / `playground/**`）。

## 行为约定

- 组件冲突覆盖：当用户同时传入 `v-model` 与显式 `modelValue`/`onUpdate:modelValue` 时，Dev 环境发出告警，并以 `v-model` 生成的 `modelValue`/`onUpdate:modelValue` 覆盖显式值。
- DOM 表单归属：DOM 表单 `v-model` 仅由宿主层（`runtime-dom`）转换；迁移完成后不再允许 `jsx-runtime` 层转换。
