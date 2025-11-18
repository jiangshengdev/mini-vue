# src/reactivity/ref 代码审核

## 1. ref(refValue) 触发类型错误与运行时崩溃（已修复）

- 位置：`src/reactivity/ref/api.ts:9-24`
- 问题：`ref<T>(value: T): Ref<T>` 直接推导传入值的类型。当参数本身就是 `Ref` 时，`T` 会被推导成 `Ref<U>`，返回类型因此变成 `Ref<Ref<U>>`。实现却在命中 `isRef` 后直接返回原始 `Ref<U>`，类型与真实值不符。例如：

  ```ts
  const base = ref(1)
  const alias = ref(base)

  // TS 认为 alias.value 是 Ref<number>，可安全访问 .value
  alias.value.value // 运行时 alias === base，alias.value 是 number，直接抛出 TypeError
  ```

- 影响：在 TS 环境下隐藏式制造了“写对代码反而崩溃”的陷阱，任何调用 `ref(existingRef)` 的场景都会得到错误的静态提示，极难排查。
- 修复方案：`src/reactivity/ref/api.ts` 改为“已有 Ref”优先级更高的函数重载，做到 `ref(existingRef)` 直接返回 `Ref<T>`，同时 `test/reactivity/ref.test.ts` 新增 `expectTypeOf(alias.value).toEqualTypeOf<number>()` 断言，类型与运行时已一致。

## 2. ref([]) 被 convert 误用 reactive 导致初始化失败（待修复）

- 位置：`src/reactivity/ref/impl.ts:70-82`
- 问题：`convert` 对所有对象统一调用 `reactive`。但当前 `reactive` 明确抛出 `TypeError('reactive 目前仅支持普通对象（不含数组）')`，因此 `ref([])`、`ref(new Date())` 等场景会在构造阶段直接失败。
- 影响：常见的“列表状态用 ref([])”场景完全不可用，即便我们只想替换整个数组也会被阻止，阻碍实际 Demo 与测试编写。
- 建议：在 `convert` 里跳过数组（例如 `Array.isArray` 分支直接返回原值），或扩展 `reactive` 新增数组支持后再统一处理。短期可先行兜底，确保 `ref([])` 至少能工作。
- 测试建议：补上 `ref([])` 的回归测试，覆盖初始化、整体替换与 `isRef` 断言，锁定后续改动不会再次触发 `reactive` 的数组限制。
