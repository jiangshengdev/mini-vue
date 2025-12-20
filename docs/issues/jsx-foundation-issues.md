# JSX Foundation 模块问题记录

## 1. `ComponentChildren` 不接受 `null` 导致类型/运行时不一致（待修复）

- 位置：`src/jsx-foundation/types.ts`（`ComponentChildren`、`RenderOutput`）
- 现状：类型仅允许 `boolean | undefined` 表示空值，显式的 `null` 被排除；但运行时的 `normalizeChildren` / `normalizeRenderOutput` 会把 `null` 视为可忽略节点并正常处理。
- 影响：
  - 常见写法如组件 `return null` 或传入 `children: null` 会在 TS 层报错，实际运行时却是合法输入，类型与行为分叉。
  - 使用 React/Vue 心智的用户容易踩坑，需要额外类型断言或绕过检查，降低易用性。
- 可能方案：
  - 直接将 `null` 纳入 `ComponentChildren`/`RenderOutput` 联合类型（如 `VirtualNodeChild | VirtualNodeChild[] | boolean | null | undefined`），与运行时处理保持一致。
  - 若 lint 规则限制显式 `null`，可通过别名封装（如 `type NullableChild = VirtualNodeChild | null`）或调整规则配置，仅对类型声明放宽，以避免在调用方层面出现类型报错。
