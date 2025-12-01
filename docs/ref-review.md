# src/reactivity/ref 代码审核

## 1. ref([]) 被 convert 误用 reactive 导致初始化失败（待修复）

- 位置：`src/reactivity/ref/impl.ts:70-82`
- 问题：`convert` 对所有对象统一调用 `reactive`。但当前 `reactive` 明确抛出 `TypeError('reactive 目前仅支持普通对象（不含数组）')`，因此 `ref([])`、`ref(new Date())` 等场景会在构造阶段直接失败。
- 影响：常见的“列表状态用 ref([])”场景完全不可用，即便我们只想替换整个数组也会被阻止，阻碍实际 Demo 与测试编写。
- 建议：在 `convert` 里跳过数组（例如 `Array.isArray` 分支直接返回原值），或扩展 `reactive` 新增数组支持后再统一处理。短期可先行兜底，确保 `ref([])` 至少能工作。
- 测试建议：补上 `ref([])` 的回归测试，覆盖初始化、整体替换与 `isRef` 断言，锁定后续改动不会再次触发 `reactive` 的数组限制。

## 2. computed 默认只读，支持通过 setter 扩展写入

- 位置：`src/reactivity/ref/computed.ts`
- 更新：仓库新增 `computed` API，内部基于惰性 `ReactiveEffect` 与缓存实现；若仅传入 getter，将创建只读计算属性，写入时会抛出 `TypeError` 提示需要 setter。
- 使用建议：需要双向绑定或快捷写入时，传入 `{ get, set }` 形式的选项对象，在 setter 中把值映射回底层 `ref`/`reactive`；若只读场景，则保持函数重载写法即可。
- 测试计划：`test/reactivity/computed.test.ts` 会覆盖缓存、脏标记与 setter 行为，后续如在组件层依赖 computed，建议再添加对应的 runtime 用例保障。
