# Reactivity 模块问题记录

## 1. 测试访问私有内部状态（待优化）

- 位置：`test/reactivity/effect-scope/lifecycle.test.ts`
- 现状：测试用例 '子 scope 被移除后 positionInParent 会被重置' 使用 `Reflect.get(scope, positionInParentKey)` 访问私有内部状态 `positionInParent`。
- 影响：这属于白盒测试，导致测试与内部实现细节紧密耦合。若内部重构（如重命名属性或改变存储结构），测试将破损。
- 提示：建议仅通过观察公共行为（如 scope 是否正确分离、effect 是否停止等）来验证，或将其明确标记为白盒测试。

## 2. 测试 Mock 内部模块路径（待优化）

- 位置：`test/reactivity/effect/basic.test.ts`
- 现状：使用 `vi.mock('@/reactivity/internals/dependency.ts', { spy: true })` mock 内部模块。
- 影响：硬编码了内部文件路径，若项目重构改变目录结构，测试将无法运行。
- 提示：应尽量避免 Mock 内部模块，或者通过依赖注入/公共 API 间接测试相关逻辑。

## 3. `watch` 对响应式对象显式 `deep: false` 时不收集依赖（待修复）

- 位置：`src/reactivity/watch/utils.ts`
- 现状：当源是响应式对象且显式传入 `deep: false` 时，`createGetter` 只返回源对象本身，不访问任何属性，导致未收集依赖，回调永远不触发。
- 影响：浅监听直接失效，调用方难以感知，违背「不深度遍历但应跟踪顶层字段变更」的预期。
- 可能方案：
  - 在浅模式下对响应式对象至少访问一次自身或顶层键以建立依赖，例如读取 `Object.keys`/`iterateDependencyKey` 或逐个访问顶层属性。
  - 通过 `effect`/`track` 辅助方法触发顶层依赖收集，并补充用例覆盖 `deep: false` + 响应式对象场景。

## 4. `readonly` 访问仍收集依赖（与 Vue 3 不一致，已修复）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 现状（修复前）：
  - `createGetter` 中无条件调用 `track`，即使是只读代理也会把读取行为收集为依赖。
  - `in` / `Object.keys` 等结构读取与数组查询方法（`includes/indexOf/lastIndexOf`）同样会建立依赖。
- 影响：会出现「effect 里读 readonly，但 reactive 写入也会触发重跑」的意外联动；同时还会产生无意义的依赖桶占用内存。
- 修复：
  - deep `readonly` 访问不再收集依赖。
  - 为兼容 runtime-core `props` 的更新语义，`shallowReadonly` 仍保持依赖追踪能力。
  - 新增内部标记 `shallowFlag` 用于区分 shallow/deep 代理；数组查询包装基于该标记决定是否 `track`。
- 位置补充：
  - `src/reactivity/array/search.ts`
  - `src/reactivity/contracts/constants.ts`
- 测试：`test/reactivity/reactive.test.ts`

## 5. `readonly` 读取 Ref 未解包（与文档不符，已修复）

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

## 6. `readonly()` 不接受 Ref 目标（与文档不符，已修复）

- 位置：`src/reactivity/reactive.ts` 与 `src/reactivity/to-raw.ts`
- 现状（修复前）：内部通过 `isSupportedTarget` 限制，仅允许普通对象或数组；传入 Ref 会抛出不支持的类型错误。
- 影响：违背官方 API「接受对象或 Ref」的约定，无法对 Ref 创建只读视图。
- 修复：
  - `readonly(ref)` / `shallowReadonly(ref)` 现在会返回只读 Ref 包装，读取正常透传，写入在开发态警告并忽略。
  - `isReadonly` 对 Ref 增加分支识别，与 Vue 3 对齐。
- 测试：
  - `test/reactivity/reactive.test.ts`
  - `test/reactivity/shallow.test.ts`
