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

## 4. 框架内部 `ReactiveEffect` 未接入作用域导致泄漏（已修复）

- 位置：`src/reactivity/effect-scope.ts`、`src/reactivity/effect.ts`、`src/reactivity/ref/computed.ts`、`src/reactivity/watch/core.ts`、`src/runtime-core/component-instance.ts`、`src/runtime-core/renderer/mount-component.ts`
- 修复：新增 `EffectScope` 实现并在 `effect`/`computed`/`watch`/组件渲染 effect 中统一调用 `recordEffectScope` 与 `recordScopeCleanup`，组件实例在创建时拥有独立 scope，`setup` 通过 `scope.run()` 包裹执行，卸载阶段 `scope.stop()` 即可级联停止所有副作用。
- 覆盖：`test/reactivity/effect.test.ts` 增补 scope 级联停止与 computed 清理用例，`test/runtime-dom/component-reactivity.test.tsx` 新增组件卸载自动清理 watch 的回归测试。

## 5. `watch(ref, cb, { deep: true })` 无法追踪嵌套字段（已修复）

- 位置：`src/reactivity/watch/utils.ts`
- 修复：`createGetter()` 在 `ref` 源的深度模式下会调用 `traverse(source.value)`，递归读取 `value` 内部字段，确保嵌套属性被依赖收集。
- 覆盖：`test/reactivity/watch.test.ts` 新增 “对 ref 启用深度模式可追踪内部字段” 用例，验证 `ref` 深层数据变动会触发回调。

## 6. `watch` 回调抛错会留下错误的 `oldValue` 与未清理的副作用（已修复）

- 位置：`src/reactivity/watch/core.ts`
- 修复：`runWatchJob()` 在调用回调前缓存旧值，并通过 `try...finally` 更新 `oldValue`/`hasOldValue` 与清理函数，确保即使回调抛错也不会遗留错误状态或跳过 cleanup。
- 覆盖：`test/reactivity/watch.test.ts` 新增 “回调抛错后仍会更新旧值并执行 cleanup” 用例，确保异常场景下行为正确。

## 7. 无活跃 effect 读取时仍创建空依赖桶导致内存浪费（已修复）

- 位置：`src/reactivity/internals/operations.ts`
- 修复：`track()` 先检查 `effectStack.current`，只有存在活跃 effect 时才创建依赖桶，避免无意义的 `Set` 占用内存。
- 覆盖：`test/reactivity/effect.test.ts` 增加 “无活跃 effect 读取不会创建空依赖桶” 用例，通过监视 `triggerEffects` 确认未收集依赖时不会触发调度。
