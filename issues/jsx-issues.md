# JSX 模块问题记录

## 1. virtualNode 标记值未做真假校验【未解决】

- 位置：`src/jsx/virtual-node/guards.ts`
- 现状：`isVirtualNode` 只要检测到传入对象拥有 `virtualNodeFlag` 这个 symbol 键就直接返回 true，没有验证该键对应的值是否确为内部写入的 `true`。外部若手动注入同名 symbol 属性即可伪装成 virtualNode，可能让渲染管线错误地访问 props/children。
- 建议：在 `Object.hasOwn(value, virtualNodeFlag)` 通过后继续校验 `value[virtualNodeFlag] === true`；同时在文档里说明该 symbol 仅用于框架内部，避免误用。

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
