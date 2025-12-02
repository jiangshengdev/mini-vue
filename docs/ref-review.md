# src/reactivity/ref 代码审核

## 1. ref([]) 现已依赖 reactive 的数组支持（已修复）

- 位置：`src/reactivity/reactive.ts`、`src/reactivity/internals/base-handlers.ts`
- 更新：`reactive` 现可代理普通对象与数组，并在 handler 中补齐 `deleteProperty`/`ownKeys`/`has` 与数组专用触发逻辑，`ref([])` 不再抛错。
- 影响：常见的列表场景可以直接通过 `ref([])` 或 `reactive([])` 建立响应式，`convert` 无需额外分支即可复用统一实现。
- 测试：`test/reactivity/ref.test.ts` 新增 “数组值在 ref 中同样保持响应式” 用例，覆盖长度追踪与 push 行为，确保回归风险被锁定。

## 2. computed 默认只读，支持通过 setter 扩展写入

- 位置：`src/reactivity/ref/computed.ts`
- 更新：仓库新增 `computed` API，内部基于惰性 `ReactiveEffect` 与缓存实现；若仅传入 getter，将创建只读计算属性，写入时会抛出 `TypeError` 提示需要 setter。
- 使用建议：需要双向绑定或快捷写入时，传入 `{ get, set }` 形式的选项对象，在 setter 中把值映射回底层 `ref`/`reactive`；若只读场景，则保持函数重载写法即可。
- 测试计划：`test/reactivity/computed.test.ts` 会覆盖缓存、脏标记与 setter 行为，后续如在组件层依赖 computed，建议再添加对应的 runtime 用例保障。
