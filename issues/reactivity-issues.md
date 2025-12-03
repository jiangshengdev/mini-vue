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

## 5. `watch(ref, cb, { deep: true })` 无法追踪嵌套字段（待修复）

- 位置：`src/reactivity/watch/utils.ts`
- 现状：`createGetter()` 在 `isRef(source)` 分支始终返回 `() => source.value`，完全忽略 `deep` 选项，导致 `deep: true` 时不会进入 `traverse()`。
- 影响：对 `Ref<PlainObject>` 或数组 Ref 的深度监听永远不会订阅内部字段，只有整个 `ref.value` 被替换时才触发回调，与文档宣称不符。
- 提示：应在 `deep` 模式下递归读取 `value`，对齐响应式对象的遍历策略。

## 6. `watch` 回调抛错会留下错误的 `oldValue` 与未清理的副作用（待修复）

- 位置：`src/reactivity/watch/core.ts`
- 现状：`runWatchJob()` 先执行用户回调，再更新 `oldValue`/`hasOldValue` 并清空 `cleanup`。回调异常会中断后续逻辑，下一次触发仍会拿到更早的旧值，上一轮注册的清理函数也不会释放。
- 影响：当回调出错时，`oldValue` 不再可信，清理函数可能重复触发甚至泄漏资源，与 Vue 3 行为不一致。
- 提示：需要在调用回调前缓存旧值，并用 `try...finally` 确保状态与清理更新。

## 7. 无活跃 effect 读取时仍创建空依赖桶导致内存浪费（待修复）

- 位置：`src/reactivity/internals/operations.ts`
- 现状：`track()` 总是先 `getOrCreateDep()`，即便随后 `trackEffect()` 因没有活跃 effect 直接返回，空的 `Set` 也会留在 `targetMap` 中。
- 影响：任意非响应式读取（例如调试时 `console.log(state.foo)`）都会让依赖表持续膨胀，属性越多越明显，产生不必要的内存占用与查找开销。
- 提示：应在确认存在活跃 effect 后再创建依赖桶，或延迟到 `trackEffect()` 内初始化。
