# mini-vue 响应式与 computed 速览

> mini-vue 为教学用途的伪 Vue 实现，以下内容基于 `src/reactivity/*` 与 `src/reactivity/ref/computed.ts` 的源码梳理。

## 1. 响应式骨架

1. **依赖容器 (`DepRegistry`)**：`src/reactivity/internals/operations.ts` 通过 `WeakMap<object, Map<key, Set<effect>>>` 记录对象属性到副作用集合的映射，`track()` 与 `trigger()` 是所有依赖收集/触发的入口。
2. **副作用栈 (`effectStack`)**：`internals/effect-stack.ts` 维护当前激活的 `ReactiveEffect`，嵌套调用时始终以栈顶元素作为依赖收集的目标。
3. **依赖算法 (`dep-utils.ts`)**：`trackEffect()` 将当前 effect 放入 `DependencyBucket`，并让 effect 反向记录该 bucket，`triggerEffects()` 则复制快照后按顺序调度，确保触发过程中集合稳定且可挂调度器。

## 2. `reactive()` 如何承上

- `reactive.ts` 仅接受普通对象，借助 `ReactiveCache` 保证“同一原对象 -> 同一 Proxy”，从而维持依赖一致性。
- `mutableHandlers.get()` 在每次取值时 `track(target, key)`，并对嵌套对象进行惰性 `reactive()` 包装，避免初始化时深层遍历。
- `mutableHandlers.set()` 借助 `Object.is` 判断新旧值，只在真实变更时 `trigger(target, key)`，将触发压力控制在必要场景。

## 3. `ReactiveEffect` 如何启下

- `effect.ts` 将副作用函数包装进类，负责：
  - `run()`：入栈、清空旧依赖、执行用户函数、出栈。
  - `stop()`：标记失活并清理所有 `DependencyBucket` 以及已注册的清理任务。
  - `registerCleanup()`：父 effect 在调用 `effect()` 时会把子 effect 的 `stop()` 注册进自己的清理序列，实现嵌套生命周期传递。
- `effect()` API 会立即执行一次 `run()`，完成首轮依赖收集；若用户传入 `scheduler`，触发时将生成 `job` 交给调度器延迟或批处理执行。

## 4. `computed` 的“承上启下”机制

源码：`src/reactivity/ref/computed.ts`

- `ComputedRefImpl` 继承 Ref 语义，核心成员：
  - `innerValue`：缓存最近一次 getter 结果。
  - `innerDirty`：脏标记，依赖变化时由调度器置为 `true`。
  - `dep`：作为 Ref 的依赖集合，供下游 effect 追踪。
- 构造函数把 getter 封装成 `ReactiveEffect`，并注入调度器：
  - 依赖字段变动 → 调度器执行 `markDirty()`。
  - `markDirty()` 若已脏则跳过，否则置脏并 `triggerEffects(dep)`，通知下游。
- 读取 `.value`：
  1. 调用 `trackEffect(this.dep)`，让外层 effect 与 computed 建立依赖关系。
  2. 若 `innerDirty` 为真，执行 `effect.run()`、缓存结果并清空脏标记。
- 写入 `.value`：
  - 只读场景使用 `createReadonlySetter()` 抛出 `TypeError`。
  - 可写场景直接调用用户自定义的 `set()`，由外部决定如何同步状态。

## 5. 心智模型与特性

- `reactive()` 提供“读时收集、写时触发”的最小能力，任何衍生 API（`computed`、JSX 渲染）都通过 `track/trigger` 与它连接。
- `ReactiveEffect` 是副作用执行单元，既可直接通过 `effect()` 暴露给用户，也可作为 `computed` 内部的惰性求值引擎。
- `computed` 既是上游依赖的消费者（内部 effect 读取原始字段），又是下游 effect 的生产者（本身携带 `dep` 并可 `trigger`），因此可以被理解为“承上启下”的桥梁。
- 当前实现未包含调度批次、组件级缓存等高级特性，重点在于演示响应式系统最核心的链路：**原始对象 → Proxy handler → DepRegistry → ReactiveEffect → Ref/Computed → 下游副作用**。

## 6. 与 Vue 正式版的差异提示

1. 仅支持普通对象与数组，Map/Set 等仍需扩展 handler 才能使用。
2. 缺少异步批量调度（如 Vue 的 `nextTick` 与 job 队列），默认每次触发直接进入调度器。
3. `computed` 不区分 `value` 是否追踪于 `effect.run()` 外部，只要 `.value` 被访问就会建立依赖；实际 Vue 中还会避免嵌套追踪导致的额外依赖。
4. JSX 渲染层采取“全量重建”策略，未实现 diff；但这与本文聚焦的响应式内核无直接冲突。

> 通过以上链路，可以快速定位 mini-vue 中 computed 相关行为：上游依赖变化 → `ReactiveEffect` 调度 → 脏标记 → 下游 effect 触发，实现一个教学友好的响应式闭环。
