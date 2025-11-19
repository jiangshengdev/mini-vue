# test 代码审核

## 1. 属性新增/删除与枚举依赖未覆盖（待补充）

- 位置：`test/reactivity/effect.test.ts`、`test/reactivity/reactive.test.ts`
- 问题：测试仅关注直接的 `get`/`set` 行为，没有任何用例触发 `delete state.foo`、`'foo' in state`、`Object.keys(state)` 等结构性访问。`mutableHandlers` 当前就缺少 `deleteProperty`/`has`/`ownKeys` trap，导致既有 Bug（删除字段或切换字段列表时 effect 不会重新执行）在测试层面毫无防线。
- 影响：依赖对象结构的真实场景（根据字段是否存在渲染、根据 `Object.keys` 生成表单）会继续出错，但测试套件会给出“全部通过”的错觉，阻碍修复与回归验证。
- 建议：补充两类用例：1）通过 `effect` 访问 `state.foo` 后执行 `delete state.foo`，期望副作用重新执行；2）`effect(() => Object.keys(state))` 与 `effect(() => 'foo' in state)`，分别断言字段新增/删除会触发 rerun。

## 2. renderer `ref` 回调与清理路径没有测试（待补充）

- 位置：`test/runtime-dom` 目录（所有用例）
- 问题：`src/runtime-dom/patch-props.ts` 支持函数式 `ref`，包括挂载时拿到 DOM、卸载时回调 `null`。然而测试完全未覆盖 `ref` 绑定，连最基本的“渲染后 ref 收到元素”都没有，更遑论在 `render` 二次调用或 `createApp.unmount()` 时重新触发清理。
- 影响：`counter.tsx` demo 就依赖 `ref` 保存按钮元素，如今没有测试兜底，renderer 中任何 ref 相关改动都可能导致 Demo 直接崩溃或内存泄漏而无人察觉。
- 建议：新增 `render`/`createApp` 层面的 ref 场景：校验回调首次得到 DOM，`render(null, container)` 或 `app.unmount()` 时会再次以 `null` 调用，且多次渲染不会重复绑定旧节点。
