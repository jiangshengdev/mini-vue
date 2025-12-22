# JSX v-model 转换实现稿（运行时兜底）

在 `jsx-runtime` 层实现运行时 `v-model` 语法糖转换（无修饰符、严格等于），即便未来有编译期转换也保留兜底，涵盖动态标签与第三方产物。

## 转换入口与范围

- 进展：转换入口已接入 `src/jsx-runtime/builder.ts`，按下述规则在运行时生效。
- 入口：`src/jsx-runtime/builder.ts`，在抽取 `key`/`children` 前对 `rawProps` 调用 `transformModelBindingProps(type, rawProps)`。
- 适用：原生表单标签（`input`/`textarea`/`select`/`option`），其他标签如出现 `v-model` 在 Dev 环境 `warn`。
- 行为：将 `v-model` 转换为对应的 DOM property + 事件（`value/checked` + `onInput/onChange`），移除原始 `v-model` 字段。

## 覆盖规则（显式 props 与 v-model 同时出现时）

- `v-model` 优先生成受控 prop/事件；显式 `value/checked/onInput/onChange` 被覆盖时 Dev 下 `warn`。
- `value` 作为候选值仍会被读取（如 checkbox/radio/option 使用 `value` 判断/回推），示例能兼容官方的“多 checkbox 绑定同一数组”场景。
- 不支持修饰符，`true-value/false-value` 也不实现；自定义 handler 请自行绑定事件。

## 元素映射与逻辑（严格等于）

- text/textarea（含非 checkbox/radio 的 input）：`value = model`，`onInput` 推送 `target.value`。
- checkbox：
  - `Array` 模型：`checked = model.includes(value)`（严格等于）；`change` 选中时追加，取消时过滤。
  - 其他：`checked = !!model`，`change` 推 `target.checked`。
- radio：`checked = model === value`，`change` 推 `value`。
- select 单选：`value = model`，`change` 推 `target.value`。
- select 多选：遍历 `options` 设置 `selected`（严格包含）；`change` 收集选中值数组。

## 开发时防御

- 非表单标签出现 `v-model` 时 `warn`（文案放 `src/messages/jsx.ts`，统一管理）。
- `v-model` 与显式 `value/checked/onInput/onChange` 冲突时 Dev 下 `warn` 提示覆盖。

## 类型（严格化留待后续）

- 在 `src/jsx-shim.d.ts` 为表单标签补充 `v-model?: unknown` 声明（TODO：收紧类型与事件签名）。
- 组件继续使用 `modelValue/onUpdate:modelValue` 协议，非原生表单组件接入放后续迭代。
