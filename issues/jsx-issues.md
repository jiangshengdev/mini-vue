# JSX 模块问题记录

## 1. virtualNode 标记值未做真假校验【已解决】

- 位置：`src/jsx/virtual-node/guards.ts`
- 现状：`isVirtualNode` 现已通过链式判断确保传入值同时满足“为对象”“拥有虚拟节点标记”“标记值为 true”，避免外部仅注入 symbol 键即伪装成功。
- 进展：`src/jsx/virtual-node/guards.ts` 与 `test/jsx-runtime/jsx.test.tsx` 已更新，新增回归测试覆盖伪造标记路径。

## 2. 未知 children 默认被字符串化【未解决】

- 位置：`src/jsx/virtual-node/children.ts`
- 现状：`flattenChild` 对数组、VNode、`string`/`number` 之外的类型统一 `String(rawChild)`，因此普通对象会被渲染为 `[object Object]`，函数会被渲染为其源代码字符串。这一行为更像“降级展示”，而不是 JSX 常见的“告警+忽略”。
- 风险：复杂对象被静默转字符串，调试时不易察觉；若未来接入更严格的 children 校验，需要提前决定策略。
- 建议：
  - 若目标与 React 对齐，可在遇到非受支持类型时抛出/记录警告并丢弃该 child。
  - 若仍需调试输出，可改为 `String(rawChild)` 同时附带 `console.warn`，提醒用户该 child 类型不受支持。
  - 若参考 Vue 3，可在 `flattenChild` 内将对象、函数等非受支持类型直接忽略，同时在 dev 模式通过 warn 报告异常，保持对模板/JSX 的容忍度一致。

## 3. `restProps` 判断多余遍历 symbol 键【未解决】

- 位置：`src/jsx/virtual-node/factory.ts`
- 现状：`createVirtualNode` 在排除 `children` 后使用 `Reflect.ownKeys(restProps).length > 0` 来判断是否还存在剩余属性。由于 `restProps` 已经是普通 props 对象，只需检查可枚举字符串键即可，`Reflect.ownKeys` 还会额外遍历 symbol 键，存在微弱性能浪费且语义偏离“props 对象”。
- 建议：改用 `Object.keys(restProps).length > 0`，或更直接地在解构时记录 `Object.keys` 结果，减少一次遍历。
