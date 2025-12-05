# JSX 模块问题记录

## 1. virtualNode 标记值未做真假校验【已解决】

- 位置：`src/jsx/virtual-node/guards.ts`
- 现状：`isVirtualNode` 现已通过链式判断确保传入值同时满足“为对象”“拥有虚拟节点标记”“标记值为 true”，避免外部仅注入 symbol 键即伪装成功。
- 进展：`src/jsx/virtual-node/guards.ts` 与 `test/jsx-runtime/jsx.test.tsx` 已更新，新增回归测试覆盖伪造标记路径。

## 2. 未知 children 默认被字符串化【已解决】

- 位置：`src/jsx/virtual-node/children.ts`
- 现状：`flattenChild` 现已对非字符串/数字/虚拟节点的 child 直接忽略，并在开发模式下通过 `console.warn('[mini-vue][jsx] …')` 提醒，行为与 Vue 3 对齐。
- 进展：`src/jsx/virtual-node/children.ts`、`src/shared/utils.ts`（新增 `isDevEnvironment`）与 `test/jsx-runtime/jsx.test.tsx` 均已更新；测试覆盖对象/函数/symbol 等子节点确保会触发 warn 并被跳过。

## 3. `restProps` 判断多余遍历 symbol 键【无需处理】

- 位置：`src/jsx/virtual-node/factory.ts`
- 现状：`Reflect.ownKeys` 在当前实现中仅带来极小的遍历开销，且不会影响 props 语义；暂未发现 symbol props 的真实需求。
- 决议：维持现状，等到遇到性能瓶颈或新的 props 约束再评估是否切换为 `Object.keys`。
