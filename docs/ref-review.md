# src/reactivity/ref 代码审核

## 1. ref([]) 被 convert 误用 reactive 导致初始化失败（待修复）

- 位置：`src/reactivity/ref/impl.ts:70-82`
- 问题：`convert` 对所有对象统一调用 `reactive`。但当前 `reactive` 明确抛出 `TypeError('reactive 目前仅支持普通对象（不含数组）')`，因此 `ref([])`、`ref(new Date())` 等场景会在构造阶段直接失败。
- 影响：常见的“列表状态用 ref([])”场景完全不可用，即便我们只想替换整个数组也会被阻止，阻碍实际 Demo 与测试编写。
- 建议：在 `convert` 里跳过数组（例如 `Array.isArray` 分支直接返回原值），或扩展 `reactive` 新增数组支持后再统一处理。短期可先行兜底，确保 `ref([])` 至少能工作。
- 测试建议：补上 `ref([])` 的回归测试，覆盖初始化、整体替换与 `isRef` 断言，锁定后续改动不会再次触发 `reactive` 的数组限制。
