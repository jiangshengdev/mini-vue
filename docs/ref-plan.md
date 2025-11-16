# ref 规划草案

## 背景与目标

- 支持 `ref`、`isRef`、`unref`、`toRef` 等基础 API，让原始值与解构对象都能参与依赖收集。
- 复用现有 `ReactiveEffect` / `DepRegistry` 架构，不引入额外调度器，但为后续 `computed`、`watch` 铺平道路。
- 在 demo 与测试中展示局部状态 + DOM 绑定的最小范例。

## API 定义

- `ref<T>(value: T): Ref<T>`：返回可变容器，`value` 可为任意类型。
- `isRef(value: unknown): value is Ref<unknown>`：通过内部标记判断。
- `unref<T>(value: T | Ref<T>): T`：便捷取值。
- `toRef(target: object, key: keyof object): Ref<object[keyof object]>`：与 Vue 对齐，用于保持响应式引用。
- `Ref<T>` 接口：`{ value: T }`，只暴露 `value` 属性。

## 核心设计

1. **依赖收集**：
   - 每个 `RefImpl` 维护一个 `Dep`，get 时 `track(dep)`，set 时 `trigger(dep)`。
   - 通过 `Object.is` 判等确保重复写入不触发。
2. **类型与标记**：
   - 复用 `shared/types.ts` 中的类型定义；新增 `isRefSymbol` 常量用于内部识别。
3. **与 reactive 互操作**：
   - `ref(reactiveObj)` 直接返回原对象（与 Vue 行为保持一致），避免重复包装。
4. **toRef 行为**：
   - 读取时透传 `target[key]`，写入时回写目标；需处理 `target` 不是响应式对象的场景。

## 代码落点

- `src/reactivity/ref/`：
  - `index.ts` 暴露 API。
  - `impl.ts` 存放 `RefImpl`/`ObjectRefImpl` 与 `convert`。
  - `internals/dep.ts`、`internals/types.ts` 管理依赖标记与触发逻辑。
- `src/reactivity/index.ts` 导出新 API。
- `src/index.ts` 对外 re-export。
- 如需共享工具，可更新 `shared/utils.ts`。

## 实施步骤

1. 在 `src/reactivity/ref/` 下拆分 `index.ts`、`impl.ts`、`internals/*` 并实现 `RefImpl`、`trackRefValue`、`triggerRefValue` 等私有函数。
2. 在 `reactivity/index.ts` 与根 `src/index.ts` 暴露 API。
3. 编写 Vitest：
   - `test/reactivity/ref.test.ts`：覆盖基本读写、依赖触发、`isRef`/`unref`、`toRef`。
   - 若需，扩展现有 effect 测试验证与 `effect` 协同。
4. 更新 demo（如 `Counter.tsx`）展示 `ref` 使用（例如计数器 state）。

## 测试计划

- `pnpm test ref.test.ts`：新文件单测。
- `pnpm test effect.test.ts`（可选）验证未破坏现有效果。
- `pnpm dev` 手动检查 demo。

## 已知风险与对策

- **与 reactive 重复包装**：写入 `ref(reactiveObj)` 时需直接返回对象并在类型层面提示。
- **依赖遗留**：忘记在 get/set 时调用 `track/trigger` 将导致无效响应，需依赖测试覆盖。
- **类型发散**：`Ref<T>` 与现有类型工具需保持一致，必要时补充类型单测或 dts 验证。
