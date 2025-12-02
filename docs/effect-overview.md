# Effect 核心行为

> 基于 `src/reactivity/effect.ts` 与 `internals/effect-stack.ts` 的源码梳理，聚焦副作用封装、依赖收集以及嵌套生命周期管理。

## ReactiveEffect 的职责边界

- **执行载体**：`ReactiveEffect` 持有用户传入的副作用函数 `fn`，统一通过 `run()` 调度，确保所有依赖收集都发生在受控上下文中。
- **调度入口**：构造函数允许注入 `scheduler`，当依赖触发时会优先交给调度器，便于实现批处理、节流或自定义优先级。
- **状态记录**：内部维护 `innerActive` 与 `dependencyBuckets`，分别表示当前 effect 是否仍需追踪，以及它隶属的依赖集合，方便停用时一次性清理。
- **清理托管**：`registerCleanup()` 将子 effect 的 `stop()` 等函数推入 `cleanupTasks`，`flushDependencies()` 执行这些任务以保持作用域一致。

## 依赖收集生命周期

1. **run()**：
   - 停用状态直接执行 `fn`，跳过收集成本。
   - 活跃状态先调用 `flushDependencies()` 清理旧依赖，再把自身压入 `effectStack`，让 `track()` 能获取到当前 effect。
   - 执行结束后无论成功或异常都要从栈顶弹出自身，避免错误的依赖归属。
2. **recordDependency()**：由 `track()` 触发，将当前 `DependencyBucket` 记录在 `dependencyBuckets` 内，供停用时反向解除绑定。
3. **flushDependencies()**：
   - 遍历所有 `dependencyBuckets`，把当前 effect 从集合中删除，确保下次触发不会意外执行。
   - 依次执行 `cleanupTasks`，以处理外部注册的清理逻辑（如嵌套子 effect 或资源释放）。

## stop() 的主被动触发

- 用户可直接调用 `EffectHandle.stop()` 立即退出活跃状态，后续即便 `track()` 被调用也不会再次收集。
- 当父 effect 通过 `effect()` 创建子 effect 时，会把 `child.stop()` 注册进 `registerCleanup()`，一旦父级停用能同步关闭子级，阻断潜在的依赖泄漏。
- 由于 `stop()` 会调用 `flushDependencies()`，每次停用都是幂等的；重复调用只会命中早停判断。

## 调度器与执行策略

- 默认：无调度器时，依赖触发会立刻 `run()`，保持可预测的同步行为。
- 自定义：提供 `scheduler(job)` 后，`trigger()` 只会把 effect 交给 `scheduler`，实际执行时机由外部控制，可实现：
  - **批量刷新**：将 effect 推入队列，由微任务集中处理。
  - **节流/防抖**：在调度器内部套用延迟策略，减少频繁 `run()`。
  - **桥接框架**：把 effect 交给组件渲染队列或状态机。

## 与 effectStack 的协同

- `effectStack` 记录当前执行链，`effectStack.current` 始终指向 `track()` 需要的副作用；嵌套 effect 会通过 `registerCleanup()` 自动串联生命周期。
- 由于 `ReactiveEffect.run()` 会在进入栈前清空旧依赖，因此即使 effect 内部条件分支发生变化，也能确保只保留最新一次执行时访问到的字段。

## 使用要点与风险提示

- 避免在 `stop()` 之后继续手动 `run()`：虽然可行，但会跳过依赖收集，通常只在一次性求值场景使用。
- 确认调度器内部始终调用 `effect.run()`：若忘记调用会导致依赖触发后完全静默。
- 嵌套场景中请始终通过 `effect()` 创建新副作用，直接实例化 `ReactiveEffect` 会错过父子清理链路。
