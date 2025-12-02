# Reactivity 模块问题记录

## 1. 删除属性不会触发依赖（已修复）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 修复：新增 `deleteProperty`/`has`/`ownKeys` trap，`trigger` 逻辑扩展至 `ADD`/`DELETE` 类型，保证删除、`in`、`Object.keys` 等结构性操作都能正确建立依赖并触发。
- 覆盖：`test/reactivity/effect.test.ts` 新增针对删除属性、`Object.keys` 与 `in` 操作的回归用例。

## 2. 属性枚举/存在性检查无法建立依赖（已修复）

- 位置：`src/reactivity/internals/base-handlers.ts`、`src/reactivity/internals/operations.ts`
- 修复：`ownKeys` 使用 `ITERATE_KEY` 记录结构性依赖，`has` 在 `in` 操作中追踪字段，`trigger` 在新增/删除时会额外通知 `ITERATE_KEY` 订阅者，同时兼容数组的 `length` 联动。
- 覆盖：`test/reactivity/effect.test.ts` 的新用例验证 `Object.keys`、`'foo' in state`、数组 push/length 截断等场景均可正确触发 effect。
