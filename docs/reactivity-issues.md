# Reactivity 模块问题记录

## 1. 删除属性不会触发依赖（待修复）

- 位置：`src/reactivity/internals/base-handlers.ts:8-39`
- 问题：`mutableHandlers` 仅实现了 `get`/`set`，`delete proxy.foo` 会直接作用于原始对象而不触发 `trigger`。读取过该字段的 effect 永远不会重新执行，删除行为对订阅者而言是“静默”的。
- 影响：依赖对象结构的逻辑（如根据 `state.foo` 是否存在来渲染）在属性被删除后不会更新，和 Vue/React 等常见响应式行为不一致，极易造成 UI 与数据脱节。
- 建议：补充 `deleteProperty` trap，沿用 `set` 中的差异判定并调用 `trigger(target, key)`；同时可针对属性存在性的 effect（`in`/`hasOwnProperty`）一并触发，避免出现死值。
- 测试建议：在 `test/effect.test.ts` 增加用例，先访问 `state.foo` 建立依赖，再执行 `delete state.foo` 验证 effect 被二次执行。

## 2. 属性枚举/存在性检查无法建立依赖（待修复）

- 位置：`src/reactivity/internals/base-handlers.ts:8-39`
- 问题：缺少 `ownKeys` 与 `has` 等 trap。`effect(() => Object.keys(state))` 或 `effect(() => 'foo' in state)` 不会触发 `track`，因此无法感知属性的新增/删除，相关 effect 实际上只会执行一次。
- 影响：任何依赖对象结构的计算（列表渲染、动态表单、表驱动校验等）都无法随字段增删而更新，属于功能性缺陷；与 Vue 生态的既有心智模型冲突，易引入难排查的 UI 状态错误。
- 建议：新增 `ownKeys` trap 并向 `track` 上报一个专门的 `ITERATE_KEY`，对属性新增/删除时统一触发；同时实现 `has` trap，对 `in` 操作建立依赖，行为参考 Vue 3 的 `mutableHandlers`。
- 测试建议：在 `test/effect.test.ts` 或新增专门用例，分别覆盖 `Object.keys` 与 `'foo' in state` 两类访问，断言属性新增/删除后 effect 会再次执行。
