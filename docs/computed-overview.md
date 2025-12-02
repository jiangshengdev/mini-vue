# Computed 专用概览

> 仅聚焦 `src/reactivity/ref/computed.ts` 中 `ComputedRefImpl` 的行为，说明 computed 自身如何维护派生状态。

## 设计目标

- **惰性求值**：只有访问 `.value` 时才运行 getter，避免无谓计算。
- **脏标记刷新**：依赖变动后不会立刻执行 getter，而是把 computed 标记为脏，等下次读取时再重新求值。
- **Ref 语义**：computed 本质上是携带 `dependencyBucket` 的 Ref，对外暴露统一的 `.value` 接口供 effect 或组件追踪。

## 核心结构

- `dependencyBucket`：收集所有读取 `.value` 的外层 effect，脏标记触发时通过 `triggerEffects()` 通知这些订阅者。
- `effect`：内部 `ReactiveEffect` 只负责执行 getter，但不会自动收集下游依赖；它的调度器只做一件事——调用 `markDirty()`。
- `needsRecompute` 与 `cachedValue`：组成最小缓存系统，当标记为脏时才清空缓存，下一次读取才会重新赋值。

## 惰性读取流程

1. 访问 `.value` 时先执行 `trackEffect(dependencyBucket)`，让调用者与当前 computed 建立依赖。
2. 如果 `needsRecompute` 为真，运行内部 effect、缓存结果并把脏标记重置为假。
3. 返回 `cachedValue`，确保多次读取仍是同一个引用，方便依赖比较。

## 只读与可写两种形态

- 直接传入 getter 时会创建只读 computed，setter 由 `createReadonlySetter()` 抛出清晰的 `TypeError`。
- 通过 `{ get, set }` 形式传入时，可写 computed 会把 `.value = x` 委托给自定义 setter，自主决定如何同步派生状态。
- 两种形态共享同一套脏标记逻辑，因此即便是可写 computed，只要 getter 依赖的值变化仍会置脏并唤起订阅者。

## 依赖传播方式

- 上游依赖：getter 内部访问的任何响应式字段都会由内部 effect 自动追踪；变动后调度器调用 `markDirty()`。
- 下游依赖：`markDirty()` 只负责把 `needsRecompute` 置为真，并 `triggerEffects(dependencyBucket)`，让所有读取过 `.value` 的 effect 在下次调度时重新读取。
- 由于脏标记具备短路判断，连续多次触发在下一次读取前只会触发一次下游通知。

## 使用与排错提示

- 若发现 computed 永远不更新，优先确认 getter 中是否实际访问了响应式字段；只有被 track 到的依赖才会触发脏标记。
- 在模板或 effect 中频繁读取 `.value` 不会重复计算，只要依赖未变，始终复用 `cachedValue`。
- 可写 computed 的 setter 需要显式更新其依赖源，否则只会触发外部逻辑但不会自动刷新 getter 结果。
