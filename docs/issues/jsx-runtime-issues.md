# JSX Runtime 模块问题记录

## 1. 运行时入口继承了组件类型不可用的问题（待修复）

- 位置：`src/jsx-runtime/builder.ts`
- 现状：`h`/`jsx`/`jsxDEV` 复用 `jsx-foundation` 的 `ElementType`/`ElementProps`，而其中组件类型被限定为 `(props: never) => RenderFunction`。导致运行时 API 在类型层面无法接受正常的函数组件或 `SetupComponent`，TSX 调用直接报错。
- 影响：核心 JSX 运行时入口类型不可用，阻断组件使用，类型体验严重退化。
- 可能方案：
  - 待 `jsx-foundation` 修正组件类型定义后同步升级依赖类型；或在 `jsx-runtime` 内部定义/覆盖更宽松的 `ElementType`/`ElementProps`，避免被错误定义绑死。
  - 增加类型测试覆盖 JSX 场景（含函数组件、SetupComponent），确保入口导出与 shim 定义一致。
