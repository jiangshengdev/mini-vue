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

## 3. 非 ref 绑定目标无法写回模型（状态：部分解决）

- 位置：`src/jsx-runtime/transform/v-model/model.ts`
- 现状：运行时兜底的 `setModelValue` 仍只支持 `ref` 写回，其他目标只告警。编译期已新增写回闭包生成（`src/vite-plugin/transform-v-model-writeback.ts`），支持静态可写路径（`ref.value`、`obj.foo`、`obj['foo']` 等）并展开为 `modelValue` + `'onUpdate:modelValue'`，对齐 Vue3 “编译期生成 assigner + 运行时触发”链路。
- 影响：未经过编译期改写的场景仍只对 `ref` 生效；动态 key/可选链/含副作用的左值尚未支持，需要后续 P1/P2 设计。
- 建议：在 TSX 中启用编译期改写；若命中不支持的动态左值，改用 `computed({ get, set })` 或手写 `modelValue` + `'onUpdate:modelValue'`。
