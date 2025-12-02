# Reactivity 模块问题记录

## 1. 删除属性不会触发依赖（已修复）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 修复：新增 `deleteProperty`/`has`/`ownKeys` trap，`trigger` 逻辑扩展至 `ADD`/`DELETE` 类型，保证删除、`in`、`Object.keys` 等结构性操作都能正确建立依赖并触发。
- 覆盖：`test/reactivity/effect.test.ts` 新增针对删除属性、`Object.keys` 与 `in` 操作的回归用例。

## 2. 属性枚举/存在性检查无法建立依赖（已修复）

- 位置：`src/reactivity/internals/base-handlers.ts`、`src/reactivity/internals/operations.ts`
- 修复：`ownKeys` 使用 `ITERATE_KEY` 记录结构性依赖，`has` 在 `in` 操作中追踪字段，`trigger` 在新增/删除时会额外通知 `ITERATE_KEY` 订阅者，同时兼容数组的 `length` 联动。
- 覆盖：`test/reactivity/effect.test.ts` 的新用例验证 `Object.keys`、`'foo' in state`、数组 push/length 截断等场景均可正确触发 effect。

## 3. 数组变异方法尚未对依赖做专门处理（待迭代）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 现状：`push`/`pop`/`splice` 等原型方法仍走默认的 `set`/`length` 联动路径，虽然大多数场景可以触发 effect，但缺少 Vue 式的“写入 length 不触发双重依赖”“`push` 自动把新增索引视为 `ADD`”等精细控制，复杂场景（例如同帧多次 `push` 或自定义调度器）会产生多余触发。
- 下一步：为数组方法注入专用分支，确保 `push`/`unshift` 等操作一次性触发 `length` 与新增索引，`splice`、`sort` 等批量修改可以复用统一的 `triggerOpTypes`，必要时为 `Instrumentations` 新建 helper，与 Vue 3 类似。
- 测试建议：在 `test/reactivity/effect.test.ts` 增补 `push`/`splice`/`sort` 的回归用例，验证依赖仅触发一次、索引与长度同步更新。
