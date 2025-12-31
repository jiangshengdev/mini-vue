# JSX Runtime 模块问题记录

## 1. 运行时入口继承了组件类型不可用的问题（状态：已解决）

- 位置：`src/jsx-runtime/builder.ts`
- 现状（修复前）：`jsx-runtime` 复用 `jsx-foundation` 的 `ElementType`/`ElementProps`，旧实现曾因组件上界使用 `(props: never)` 导致 TSX props 推导坍缩。
- 解决：已在 `jsx-foundation` 修正组件类型上界与 `ElementProps` 推导链，`jsx-runtime` 复用后恢复可用。
- 回归：`test/jsx-foundation/element-type.types.test.tsx`

## 2. 多选 select 初始选中态未按模型值同步（状态：已解决）

- 位置：`src/jsx-runtime/transform/v-model/select-multiple.ts`
- 现状：转换时仅设置 `props.value = modelValue`，未遍历 `selectedOptions` 或逐项设置 `option.selected`，DOM 多选控件不会根据数组值恢复初始选中态。
- 影响：使用 `v-model` 绑定多选 `<select>` 时，初始渲染的选中状态与模型值不一致，交互前即失真。
- 可能方案：
  - 在 `onRender`/绑定阶段遍历 `options`，按模型数组严格等于匹配设置 `option.selected`，或手动同步 `selectedOptions`。
  - 调整事件处理保持严格等于，增补对应用例覆盖初始化与变更。

## 3. 非 ref 绑定目标无法写回模型（状态：待设计）

- 位置：`src/jsx-runtime/transform/v-model/model.ts`
- 现状：`setModelValue` 仅在目标为 `ref` 时写回；非 `ref` 情况只发出 `console.warn` 且不更新值，导致绑定普通变量时 UI 与数据永远不同步。
- 影响：`v-model` 仅对 `ref` 生效，开发者可能在运行时才发现数据未更新，体验与 Vue 预期不符。
- 可能方案：
  - 明确限定支持（仅 ref）并在 Dev 下抛更明显的异常，或在安全前提下允许对可写对象路径（如 `{ value }`）进行赋值。
  - 在文档/类型上注明限制，同时补充用例覆盖 ref/非 ref 场景，避免静默失败。
