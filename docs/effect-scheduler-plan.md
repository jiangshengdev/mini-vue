# `effect` 支持 `scheduler` 的实现计划

## 现状评估

- `ReactiveEffect` 只保存 `fn`、`deps`、`cleanupFns`，触发时直接调用 `run()`；没有调度入口，`trigger` 后会立即同步执行。
- `effect(fn)` 返回 `ReactiveEffect` 实例，但没有能力注入额外配置；调用方也无法在触发时做节流、批处理或延迟。
- `Dep` 目前只是 `Set<ReactiveEffect>`，`trigger` 时逐个执行 `run()`；若要加入调度，需要让 `Dep` 知道调用 `schedule` 还是 `run`。

## 目标

在不破坏现有 API 的前提下，为 `effect` 增加可选的 `scheduler` 支持：

- 调用方可传入 `{ scheduler?: (job: () => void) => void }`。
- 若存在 `scheduler`，触发时不直接执行 `run()`，改为把 `run` 包装成 job 交给调度器。

## 设计要点

1. **扩展 `ReactiveEffect`**
   - 新增可选的 `scheduler` 属性（函数类型）。
   - 在 `trigger` 步骤中，存在 scheduler 时调用 `scheduler(() => runEffect(instance))`；否则保留原行为。
   - 为保证 `stop()` 后不再调度，需在触发前检查 `instance.active`。

2. **升级 `effect` API**
   - 支持第二个参数 `options`，目前只包含 `scheduler`。
   - 构造 `ReactiveEffect` 时把 scheduler 传入。
   - 返回值仍为 `ReactiveEffect`，维持兼容性。

3. **更新依赖管理**
   - 在 `trigger` 的实现中判断 scheduler。
   - `operations.ts` 中的 `triggerEffects`（若存在）需要调整逻辑：优先放入调度器。

4. **测试与验证**
   - 新增单测用自定义 scheduler 收集 job，确认触发时不会立即执行。
   - 校验 `stop()` 后 scheduler 不再收到任务。
   - 保持现有测试全部通过，确保无行为回退。

## 后续扩展（可选）

- 在 scheduler 内实现简单的微任务队列，后续可用于组件层的批量更新。
- 允许 `effect` 返回清理函数，支持切换 scheduler 时解除旧任务。
