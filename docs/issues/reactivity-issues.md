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
