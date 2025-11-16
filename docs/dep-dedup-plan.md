# track/trigger 逻辑复用方案

## 重复现状
- `src/reactivity/internals/operations.ts` 与 `src/reactivity/ref/internals/dep.ts` 均实现了 `track`/`trigger` 的下半部分：
  - 读取 `effectScope.current` 判定当前副作用。
  - `dep` 去重并 `recordDependency`。
  - `snapshot` + `shouldRun` 控制触发流程。
- 两处代码仅在“如何拿到 dep”上不同：
  - 对象响应式通过 `DepRegistry` 将 `target+key` 映射为 `Dep`。
  - ref 直接持有 `dep` 集合。

## 拆分目标
1. 把公共的 `collectEffect(dep)` / `dispatchEffects(dep)` 提取成可复用助手。
2. 使 `operations.ts` 与 `ref` 模块都调用同一套底层逻辑，避免未来调度策略不一致。
3. 保持 ref 模块的独立目录结构，不引入环状依赖。

## 目录建议
- 新建 `src/reactivity/internals/depUtils.ts`：
  - `collectEffect(dep: Dep)`：封装当前 effect 判定 + 去重 + `recordDependency`。
  - `dispatchEffects(dep: Dep)`：封装 `snapshot` + `shouldRun` 逻辑。
  - `shouldRun`、`snapshotEffects` 作为模块私有函数。
- `operations.ts` 中 `track/trigger`：
  - 仍保留 `DepRegistry`，但在获取 `dep` 后分别调用 `collectEffect(dep)` 与 `dispatchEffects(dep)`。
- `ref/internals/dep.ts`：
  - 精简为 `trackRefValue(target)` => `collectEffect(target.dep)`。
  - `triggerRefValue(target)` => `dispatchEffects(target.dep)`。

## 注意事项
- `depUtils.ts` 需要引用 `effectScope` 与 `Dep/EffectInstance`，与当前文件相同；路径位于 `internals/` 可供 ref 模块（通过相对路径 `../internals/depUtils.ts`）导入。
- 防止循环依赖：`depUtils.ts` 不应 import 自 ref 模块，只依赖 `effectScope` 与 shared types。
- TypeScript 导入：保持显式 `.ts` 扩展。

## 实施步骤（后续执行时）
1. 新建 `src/reactivity/internals/depUtils.ts`，迁移 `snapshot/shouldRun` 与公共逻辑。
2. 更新 `operations.ts` 使用新助手；确认 `DepRegistry` 仍仅负责 `dep` 获取。
3. 更新 `ref/internals/dep.ts`，只保留 `trackRefValue`/`triggerRefValue` 并调用公共函数。
4. 回归 `pnpm test test/reactivity/ref.test.ts` 与 `pnpm test test/reactivity/effect.test.ts`，确保行为一致。
