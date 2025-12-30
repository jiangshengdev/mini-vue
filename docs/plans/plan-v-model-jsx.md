# JSX v-model 设计计划

为 JSX 增加 `v-model` 语法糖：在无编译期的前提下，把 `<input v-model={x}>` 等转换为对应的 DOM property + 事件绑定，覆盖常见表单元素，简化表单绑定样板。仅接受单一 `v-model` prop，不支持修饰符；自定义 handler 请直接用显式事件。即便未来有编译期转换，DOM 宿主仍保留运行时兜底转换（由 `runtime-dom` 负责），覆盖动态标签与第三方产物。

## Scope

- In: 设计/实现 v-model JSX 语法糖的转换策略，按元素类型生成 value/checked + 事件；调整运行时或辅助层支持该转换；增补类型声明；新增测试/Playground 验证。
- Out: 模板编译器、修饰符支持、组件的 `modelValue` 协议改动、其他指令语法，自定义 handler 透传。

## Action items

- [x] 梳理现状：确认 JSX 运行时入口（`src/jsx-runtime`）与虚拟节点构建路径，找出可插入 v-model 转换的层。
- [x] 设计转换规则：按元素类型（text/textarea、checkbox、radio、select 单/多选）决定 property（value/checked）与事件（input/change），定义单一 `v-model` prop 形态（无修饰符，严格等于匹配）。
- [x] 实现转换入口：在 jsx-runtime/builder 或虚拟节点创建前拦截 props，识别 `v-model`，生成等价的 value/checked + handler，移除原始 `v-model`；默认使用严格等于判定（不做松散相等）。
- [x] 补充类型：在 `src/jsx-shim.d.ts` 等声明中为 `v-model` 增加签名，覆盖 IntrinsicElements 中表单标签（单一 prop），组件侧继续使用 `modelValue/onUpdate:modelValue`。
- [x] 更新示例：改造 `playground/views/basic/form-bindings.tsx` 使用 `v-model` 语法糖，验证体验简化。
- [x] 添加测试/验证：`test/runtime-dom/props/v-model.test.tsx` 覆盖文本、checkbox（布尔/数组）、radio、select 单/多选及告警行为。
- [x] 风险检查：验证了非表单/冲突属性/只读目标的告警路径，受控属性写入与事件派发符合预期。

## Open questions

- 组件 `v-model`（默认 `modelValue` + `onUpdate:modelValue`）的运行时转换计划已单独拆分，详见 [plan-v-model-component](./plan-v-model-component.md)。

## 后续收敛（面向非 DOM 宿主）

- 由于计划支持非 DOM 宿主渲染器，DOM 表单 `v-model` 适配应迁移到宿主层（优先 `runtime-dom`），并在迁移完成后移除 `jsx-runtime` 的 DOM 转换；这样只要使用 `runtime-dom`，不管 JSX 还是手写 `h` 都能使用 DOM 表单 `v-model`。

## 与 Vue 官方的对齐与收敛

- 对齐点：文本/textarea 用 `value+input`，checkbox/radio 用 `checked+change`，select 用 `value`/遍历 `option.selected` + `change`，初始 `value/checked/selected` attribute 由状态覆盖。
- 收敛点：仅单一 `v-model` prop；无修饰符、无 `true-value/false-value`；使用严格等于而非松散等于；原生元素靠运行时转换，组件侧沿用 `modelValue/update:modelValue` 协议。
