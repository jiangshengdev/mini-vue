# JSX Runtime 代码审计

## 1. h 覆盖 props.children（已修复）

- 位置：`src/jsx-runtime/shared.ts:21-33`
- 问题：`h` 会在展开 props 后无条件写入 `children`，即使调用方已经通过 `props.children` 传入内容且可变参数为空数组，也会被覆盖成 `[]`。像 `h(Component, { children: <span/> })` 这样的调用会导致子节点全部丢失。
- 影响：手写渲染器或测试里直接调用 `h` 时无法用 props 传递 children，行为与 JSX 编译后的 `jsx/jsxs` 不一致，阻碍了组件封装场景（高阶组件、渲染函数等）。
- 覆盖：`test/jsx-runtime/h.test.ts` 中新增三条用例（保留 props.children / 变参覆盖 / 保留其他 props）已覆盖现有修复逻辑，防止回归。
- 修复：2025-11-16 在 `src/jsx-runtime/shared.ts:24-37` 中为 `h` 增加空 children 早退逻辑，确保未传入额外 children 时会完整保留 `props.children`。
- 验证：`test/jsx-runtime/h.test.ts` 的三条用例覆盖“保留 props.children / 变参覆盖 / 保留其他 props”场景，`pnpm test test/jsx-runtime/h.test.ts` 通过确认行为稳定。

## 2. h 的 children 类型过窄（已修复）

- 位置：`src/jsx-runtime/shared.ts:17-33`，类型定义参考 `src/jsx/vnode/types.ts:12-25`
- 问题：`h` 的可变 children 被声明为 `VNodeChild[]`，其中不包含 `boolean | null`。这与 `ComponentChildren` 和 `normalizeChildren` 允许布尔值/空值的设计相悖，导致 `h('div', null, condition && h('span'))` 等常见写法在 TypeScript 下直接报错。
- 影响：手动调用 `h` 时无法编写条件渲染、短路表达式等 JSX 等价语法，只能大量断言或包装成数组，体验与 JSX 形成割裂。
- 复现：`test/jsx-runtime/h.typing.ts` 曾在 `pnpm exec tsc --noEmit` 下报 `Type 'boolean' is not assignable to type 'VNodeChild'`，明确展示布尔短路无法通过编译。
- 修复：2025-11-16 将 `h` 的 rest 参数直接改用 `ComponentChildren[]`（`src/jsx-runtime/shared.ts:24-37`），布尔/空值能与 `ComponentChildren` 对齐，`pnpm exec tsc --noEmit` 已重新通过。
- 验证：`test/jsx-runtime/h.typing.ts` 作为类型示例不再报错，保持布尔短路写法以便后续回归检查。

## 3. h 无法注入 key（已修复）

- 位置：`src/jsx-runtime/shared.ts:17-33`
- 问题：`createJSXNode` 支持单独的 `key` 参数，但 `h` 没有暴露任何方式设置 key，且 `props` 中的 `key` 也不会被提取出来传给 `createJSXNode`。通过 `h` 构造的 VNode 的 `key` 永远是 `undefined`，同时 `key` 会错误地留在组件 props 上。
- 影响：使用 `h` 创建的节点无法参与后续可能的 diff/复用逻辑，也与 JSX 运行时（会剔除 props.key）表现不一致，增加迁移成本。
- 修复：2025-11-16 在 `src/jsx-runtime/shared.ts:24-48` 中复制 props 时顺带移除 `key`，并将值传入 `createJSXNode` 的第三个参数；若 key 是唯一字段会自动把 props 置空，避免污染组件 props。
- 验证：`test/jsx-runtime/h.test.ts` 新增“将 props.key 提升为 vnode.key”断言，执行 `pnpm test test/jsx-runtime/h.test.ts` 与 `pnpm exec tsc --noEmit` 均已通过，确认运行时与类型层表现一致。
