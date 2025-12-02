# runtime-core 问题记录

## 1. 空组件未执行卸载导致副作用泄漏（已修复）

- 位置：`src/runtime-core/renderer/mount-component.ts`
- 问题：函数组件若返回 `null`/`undefined`/`false` 等“空子树”，`mountComponent` 过去会返回 `undefined` 的 `MountedHandle`，导致 `render`/`mountChild` 不会缓存清理逻辑，`teardownComponentInstance` 也不会被触发。
- 修复：`mountComponent` 现始终返回一个句柄，即便没有实际宿主节点也会提供空数组 `nodes` 与 `teardown`。这样 `renderer` 在卸载或 rerender 时依旧会执行 `teardownComponentInstance`，确保内部 `ReactiveEffect` 被 `stop()`。
- 影响验证：`test/runtime-dom/component-reactivity.test.tsx` 新增“返回空子树的组件也会在卸载时停止 effect”用例，确认多次状态切换与卸载后不会产生额外副作用。
