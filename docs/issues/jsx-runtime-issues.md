# JSX Runtime 模块问题记录

## 1. 运行时入口继承了组件类型不可用的问题（待修复）

- 位置：`src/jsx-runtime/builder.ts`
- 现状：`h`/`jsx`/`jsxDEV` 复用 `jsx-foundation` 的 `ElementType`/`ElementProps`，而其中组件类型被限定为 `(props: never) => RenderFunction`。导致运行时 API 在类型层面无法接受正常的函数组件或 `SetupComponent`，TSX 调用直接报错。
- 影响：核心 JSX 运行时入口类型不可用，阻断组件使用，类型体验严重退化。
- 可能方案：
  - 待 `jsx-foundation` 修正组件类型定义后同步升级依赖类型；或在 `jsx-runtime` 内部定义/覆盖更宽松的 `ElementType`/`ElementProps`，避免被错误定义绑死。
  - 增加类型测试覆盖 JSX 场景（含函数组件、SetupComponent），确保入口导出与 shim 定义一致。

## 2. 多选 select 初始选中态未按模型值同步（已修复）

- 位置：`src/jsx-runtime/transform/v-model/select-multiple.ts`
- 现状：转换时仅设置 `props.value = modelValue`，未遍历 `selectedOptions` 或逐项设置 `option.selected`，DOM 多选控件不会根据数组值恢复初始选中态。
- 影响：使用 `v-model` 绑定多选 `<select>` 时，初始渲染的选中状态与模型值不一致，交互前即失真。
- 可能方案：
  - 在 `onRender`/绑定阶段遍历 `options`，按模型数组严格等于匹配设置 `option.selected`，或手动同步 `selectedOptions`。
  - 调整事件处理保持严格等于，增补对应用例覆盖初始化与变更。

## 3. 非 ref 绑定目标无法写回模型（待设计）

- 位置：`src/jsx-runtime/transform/v-model/model.ts`
- 现状：`setModelValue` 仅在目标为 `ref` 时写回；非 `ref` 情况只发出 `console.warn` 且不更新值，导致绑定普通变量时 UI 与数据永远不同步。
- 影响：`v-model` 仅对 `ref` 生效，开发者可能在运行时才发现数据未更新，体验与 Vue 预期不符。
- 可能方案：
  - 明确限定支持（仅 ref）并在 Dev 下抛更明显的异常，或在安全前提下允许对可写对象路径（如 `{ value }`）进行赋值。
  - 在文档/类型上注明限制，同时补充用例覆盖 ref/非 ref 场景，避免静默失败。
