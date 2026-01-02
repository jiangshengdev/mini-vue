# Plan

为 TSX 场景补齐 `v-model` 的“写回策略”：在编译期把 `v-model={...}` 展开为等价的受控 props（`modelValue` + `'onUpdate:modelValue'`），并生成写回闭包；运行时保持“只支持 `Ref` 写回”的兜底约束，避免在运行期推断任意表达式的可写性。

## Scope

- In:
  - 仅 TS/TSX（Vite transform）层面的 source-to-source 改写，不引入模板/SFC 编译器。
  - 绑定目标语义：运行时只保证 `Ref` 可写；编译期负责把“可写左值”转换为可写闭包。
  - P0/P1/P2 分阶段：先支持静态深层路径，再引入动态 key，最后处理副作用与单次求值。
  - 动态 key 默认策略对齐 Vue3：事件触发时实时求值（不在 render 阶段额外缓存 key）。
- Out:
  - 具名 `v-model`、modifiers、`true-value/false-value` 等完整 Vue3 指令语义。
  - `a?.b` / `a?.[b]` 这类不可赋值左值的“存在才写回”非常规语义。

## Action items

[x] 盘点现状与对齐点：记录 mini-vue 当前写回限制（`src/jsx-runtime/transform/v-model/model.ts` 与 `src/runtime-dom/props/v-model/model.ts`），并在文档中对齐 Vue3 官方“编译期生成 assigner + 运行时触发”原则（Vue3 `compiler-core`/`compiler-dom`/`runtime-dom` 的 `v-model` 链路）。  
[x] 固化产物约定：将 TSX 的 `v-model` 统一展开为 `modelValue` + `...{ 'onUpdate:modelValue': (...) => ... }`（通过对象 spread 注入 `'onUpdate:modelValue'`，避免 TSX attribute 语法限制）。  
[x] P0：支持静态深层路径写回（低风险形态）。

- 支持：`ref.value`、`obj.foo`、`obj.foo.bar`、`obj['foo']`、`obj['foo'].bar`。
- 不支持并诊断：`obj[key]`/`arr[index]` 等动态 key、可选链、非左值表达式。
- 诊断建议：给出显式替代写法（`computed({ get, set })` 或手写 `modelValue` + `'onUpdate:modelValue'`）。
- 实现：新增 `mini-vue:transform-v-model-writeback`（默认随 `miniVueCompilerPlugin` 启用），在组件标签命中静态路径时生成 `modelValue` 与 `'onUpdate:modelValue'` 写回闭包；不命中路径会输出警告并保留运行时只写 Ref 的兜底行为。  
  [ ] P1：支持动态 key 的 `ElementAccessExpression`，并先定清楚“缓存/求值”语义。
  - 支持：`obj[key]`、`arr[index]`、`obj[nested.key]` 等动态访问。
  - 约定（对齐 Vue3）：默认不缓存 key，写回闭包在事件触发时实时读取 key；是否允许 base/key 有副作用（默认先拒绝）。
  - 继续不支持：可选链动态访问、明显副作用（如 `getObj()[key]`、`obj[getKey()]`）。  
    [ ] P2：支持复杂 base/key（含调用/副作用），引入“单次求值”策略稳定语义。
  - 约束：对 base/key 生成临时变量，确保 render 阶段只求值一次；写回闭包引用临时变量。
  - 明确：事件触发时写回使用的是“哪一轮 render 生成的 handler”（依赖 props patch 更新语义）。  
    [x] 补齐落盘与互链：在 `docs/issues/jsx-runtime-issues.md` 更新“非 Ref 目标不写回”的约束与推荐方案，并在 `docs/plans/plan-v-model-component.md` 互链该计划。  
    [x] 明确验证清单（用于后续实现）：列出 P0/P1/P2 的最小回归场景（静态链/动态 key/副作用求值/不支持形态诊断），以及预期新增的单测位置（`test/vite-plugin/**`、`test/runtime-dom/**`、`test/jsx-runtime/**`）。

验证清单（P0 已覆盖）：

- 组件 TSX 静态路径展开与写回闭包生成：`test/vite-plugin/v-model-writeback.test.ts`
- DOM/运行时兜底行为：`test/runtime-dom/props/v-model.test.tsx`
- 不支持的动态 key/可选链告警：`test/vite-plugin/v-model-writeback.test.ts`

## Open questions

- DOM 表单的 TSX 编译期展开策略单独拆分为计划：`docs/plans/plan-tsx-compile-transform-v-model-dom.md`（分 P 推进）。
