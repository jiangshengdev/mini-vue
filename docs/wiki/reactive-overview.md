# Reactive 核心原理

> 基于 `src/reactivity/reactive.ts`、`internals/base-handlers.ts` 与 `internals/operations.ts` 的源码解构，聚焦对象/数组在 mini-vue 中的 Proxy 化流程与依赖调度关系。

## ReactiveCache：入口一致性

- `reactive()` 首先通过 `ReactiveCache` 维护 **原对象 ↔ 代理** 的双向 `WeakMap`，保证同一引用只会生成一次 Proxy，避免出现多个代理导致的依赖分裂。
- 只要命中缓存即可复用旧代理，实现“重复调用不刷新依赖”的幂等行为；未命中时才由 `mutableHandlers` 创建新 Proxy 并登记双向映射。
- 入口层面仅允许普通对象和数组：数组以 `Array.isArray()` 判定，普通对象依赖 `isPlainObject()`。这一约束保证 handler 逻辑可以专注在对象/数组两类结构，不必兼容 Map/Set 等集合。

## 对象：读写即依赖链

1. **惰性包装**：`mutableHandlers.get()` 对嵌套对象在访问时才递归 `reactive()`，避免初始化阶段的全量深拷贝。
2. **读取追踪**：每次读取都会调用 `track(target, key)` 记录“对象 + 属性”与当前 `ReactiveEffect` 的关系；如果用户在 effect 内读取多个字段，会建立多条键级依赖。
3. **写入触发**：`mutableHandlers.set()` 使用 `Object.is(oldValue, newValue)` 判等：只有值真正变化或属性首次出现时才 `trigger(target, key)`。
4. **结构信号**：对象新增属性时额外触发 `trigger(target, iterateDependencyKey)`，确保依赖 `for...in`/`Object.keys` 等遍历的 effect 能收到通知；删除属性复用相同机制。

> 这一套流程让普通对象具备“读时收集、写时触达”的确定性：读取字段即订阅，字段变更即触发。

## 数组：索引与长度的双轨

1. **索引判定**：`mutableHandlers.set()` 利用 `isArrayIndex(key)` 判断当前写入是否针对数值索引。新增索引时会使用 `trigger(target, 'length')` 同步长度依赖。
2. **长度依赖**：`internals/operations.ts` 在处理 `length` 触发时，会检查所有已追踪的索引，只有索引值 `>= newLength` 才被触发，以模拟“截断数组”的语义。
3. **遍历通知**：任何会影响迭代顺序的操作（`push`、`pop`、`splice` 等）都通过结构信号触发 `iterateDependencyKey`，让基于 `for...of`/`Array.from` 的 effect 能够重新执行。
4. **复用缓存**：与对象相同，数组也依赖 `ReactiveCache`，因此对同一数组多次调用 `reactive()` 不会重复代理，其所有索引/长度依赖都会集中在单个 Proxy 上。

> mini-vue 当前尚未对单个数组变异方法做更细腻的依赖定位（如区分 `push`/`pop` 的具体影响），而是通过“索引 + length + 迭代”三类信号覆盖主要场景，足以支撑教学级的响应式心智。

## 依赖调度链路

`reactive()` 的工作流可以简化理解为：**原始对象** 经由 `ReactiveCache` 得到 **Proxy**，`get` 时建立依赖，`set` 时触发 `DependencyBucket` 中的 `ReactiveEffect`，再交由调度器或 effect 自身重新执行。下方几点展开每一步的细节：

- `track()` 将当前激活的 `ReactiveEffect` 注册到 `DependencyBucket`，effect 也会反向记录该 bucket，方便 `stop()` 清理。
- `trigger()` 借助 `Set` 去重目标字段、`iterateDependencyKey` 以及 `length` 等关联依赖，再逐个调用 `triggerEffects()`；若提供 `scheduler`，effect 实际执行可以交给调度器（用于批量或延迟）。
- 数组和对象都遵循这一链路，差别仅在 `track/trigger` 调用时决定的 key：对象以字段为主，数组则结合索引、`length` 与迭代符号。
