# Reactivity 模块问题记录

## 1. 测试访问私有内部状态（状态：已解决）

- 位置：`test/reactivity/effect-scope/lifecycle.test.ts`
- 修复：移除 `Reflect.get` 对私有字段的读取，改用外部行为验证「子 scope 停止/移除后不会破坏剩余子 scope 的生命周期管理」。
- 收益：测试不再依赖私有字段命名与存储结构，更抗内部重构。

## 2. 测试 Mock 内部模块路径（状态：已解决）

- 位置：`test/reactivity/effect/basic.test.ts`
- 修复：移除对 `@/reactivity/internals/dependency.ts` 的 mock，引入稳定的 testing seam：`@/reactivity/index.ts` 导出 `__hasDependencyBucket`（来自 `src/reactivity/testing.ts`），用其直接断言「无活跃 effect 读取」不会创建依赖桶。
- 收益：避免硬编码内部文件路径，同时保留对内部优化点的覆盖。

## 3. `watch` 对响应式对象显式 `deep: false` 时不收集依赖（状态：已解决）

- 位置：
  - `src/reactivity/watch/utils.ts`
  - `src/reactivity/watch/core.ts`
- 现状（修复前）：当源是响应式对象且显式传入 `deep: false` 时，`createGetter` 只返回源对象本身，不访问任何属性，导致未收集依赖，回调永远不触发。
- 修复：
  - reactive 源 + `deep: false` 时改为遍历一层顶层键以建立依赖（不再深度递归）。
  - reactive 源在浅模式下启用 `forceTrigger`，避免 `newValue === oldValue` 时被短路跳过回调。
- 测试：`test/reactivity/watch/deep.test.ts`

## 4. `readonly` 访问仍收集依赖（状态：已解决；备注：与 Vue 3 不一致）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 现状（修复前）：
  - `createGetter` 中无条件调用 `track`，即使是只读代理也会把读取行为收集为依赖。
  - `in` / `Object.keys` 等结构读取与数组查询方法（`includes/indexOf/lastIndexOf`）同样会建立依赖。
- 影响：会出现「effect 里读 readonly，但 reactive 写入也会触发重跑」的意外联动；同时还会产生无意义的依赖桶占用内存。
- 修复：
  - deep `readonly` 与 `shallowReadonly` 访问不再收集依赖。
  - 新增内部标记 `shallowFlag` 用于区分 shallow/deep 代理；数组查询包装基于该标记决定是否 `track`。
- 位置补充：
  - `src/reactivity/array/search.ts`
  - `src/reactivity/contracts/constants.ts`
- 测试：`test/reactivity/reactive.test.ts`

## 5. `readonly` 读取 Ref 未解包（状态：已解决；备注：与文档不符）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 现状（修复前）：只读代理读取属性值为 Ref 时直接返回 Ref 对象，而不是像 `reactive` 那样解包成值。
- 影响：
  - 与类型/文档中「对象属性 Ref 会解包」的描述不一致。
  - 只读代理会把 Ref 直接暴露出去，用户可通过 `.value` 绕过只读限制并写入。
- 修复：
  - readonly/shallowReadonly 在对象属性读取 Ref 时会解包（数组索引 Ref 保持 Ref）。
  - deep readonly 下对 Ref 解包出来的对象值返回 readonly 视图，避免通过 Ref 逃逸写入。
- 测试：
  - `test/reactivity/reactive.test.ts`
  - `test/reactivity/shallow.test.ts`

## 6. `readonly()` 不接受 Ref 目标（状态：已解决；备注：与文档不符）

- 位置：`src/reactivity/reactive.ts` 与 `src/reactivity/to-raw.ts`
- 现状（修复前）：内部通过 `isSupportedTarget` 限制，仅允许普通对象或数组；传入 Ref 会抛出不支持的类型错误。
- 影响：违背官方 API「接受对象或 Ref」的约定，无法对 Ref 创建只读视图。
- 修复：
  - `reactive(ref)` / `shallowReactive(ref)` 现在会返回基于 Ref 的 Proxy，保持 `isRef` 为 `true`。
  - `readonly(ref)` / `shallowReadonly(ref)` 现在走 Proxy 统一模型，读取正常透传，写入在开发态警告并忽略。
  - `isReadonly` 与 `isReactive` 均可在只读包装下识别 Ref/代理，贴近 Vue 3。

## 7. 不支持类型策略（状态：已解决；备注：短期仅支持 plain object/Array/Ref）

- 位置：`src/reactivity/reactive.ts`
- 行为：原始值、不可扩展对象以及 Map/Set/Date 等暂不支持观测的类型会在开发态警告并原样返回（不再抛错）。
- 说明：保持 API 可用性的同时标注限制，便于后续按需扩展集合类型等能力。
- 测试：
  - `test/reactivity/reactive.test.ts`
  - `test/reactivity/shallow.test.ts`
