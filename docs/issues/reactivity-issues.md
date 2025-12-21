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
