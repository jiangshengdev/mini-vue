# runtime-core 问题记录

## 1. 空组件未执行卸载导致副作用泄漏（待修复）

- 位置：`src/runtime-core/renderer/mount-component.ts:60-75`、`src/runtime-core/renderer/mount-child.ts:20-63`
- 问题：函数组件若返回 `null`/`undefined`/`false` 等“空子树”，`mountComponent` 会得到 `undefined` 的 `MountedHandle` 并直接将该值向上传递；`render` 和父级 `mountChild` 只在句柄存在时才缓存清理逻辑，因此 `teardownComponentInstance` 永远不会被调用，`ReactiveEffect` 也不会停止。对同一容器再次调用 `render` 会重新创建新的组件实例，而旧实例的副作用依旧活跃，形成成倍增长的订阅与 DOM 引用。
- 影响：
  - `renderer.unmount` 无法释放这类组件的 effect，内存与依赖集合持续累积。
  - 重新渲染根组件时会有多个历史 effect 同时响应相同的响应式数据，导致重复渲染、性能恶化甚至访问已经被移除的 DOM。
- 可能的解决方案：
  - 让 `mountComponent` 无论是否产出宿主节点，都返回一个负责 `teardownComponentInstance` 的句柄（即便 `nodes` 为空数组）；或者在 `mountChild` 层面为 `undefined` 结果单独缓存清理回调，确保 `renderer` 可以触达并执行组件卸载。
  - rerender/re-render 前应统一调用该句柄的 `teardown`，保证 `ReactiveEffect.stop()` 被触发。
- 测试建议：在 `test/runtime-dom/component-reactivity.test.tsx` 新增用例，创建返回 `null` 的组件并多次更新/卸载，断言 effect 数量不会增长且不会访问已卸载的 DOM。
