# TSX 编译期能力优先级（结论）

> 前提：项目长期使用 TSX，不计划引入 Vue Template/SFC；编译期能力主要通过 Vite 的 TS/TSX source-to-source transform 实现。

## 评判标准

- 优先解决“容易踩坑/收益确定”的 DX 问题（语义安全 + 类型联动），其次才是运行时性能微优化。
- 尽量复用现有基础设施：`src/vite-plugin/**` 的 TS AST 改写能力、`jsx-runtime`/`runtime-dom` 的既有运行时契约。
- 避免强耦合到“模板编译器专属”的优化模型（如 hoist/patchFlags），除非愿意同步调整当前 VNode 的运行时元信息写入策略。

## 优先级建议（收益最大 → 最小）

### P0：props 解构编译期改写（已在推进）

- 目标：允许在 `SetupComponent` 顶层安全解构 `props`，并将对解构变量的引用改写回 `props.xxx`，规避闭包捕获旧值/丢响应式的问题。
- 价值：TSX 中最常见写法之一，且踩坑隐蔽；改写后可显著降低心智负担。
- 参考：`docs/plans/plan-tsx-compile-transform-props-destructure.md`

### P0：v-model “写回策略”的编译期增强（TSX 关键补齐）

- 目标：在不改动用户心智的前提下，补齐 `v-model={obj.foo}` 等“非 Ref 左值”的写回能力（当前运行时难以可靠支持）。
- 建议路径：
  - 编译期拿到可写左值形态后改写为 `toRef(obj, 'foo')`（或直接展开为 `modelValue` + `onUpdate:modelValue`），把“写回能力”变成可静态保证的语义。
  - 同步补齐 TS 类型联动：让组件 `'v-model'` 的类型能推导到 `Ref<modelValueType>`，而不是长期停留在 `Ref<unknown>`。
- 相关背景：`docs/issues/jsx-runtime-issues.md`、`docs/plans/plan-v-model-component.md`

### P1：setup ctx 基建（emit/slots/attrs）→ 再做 slots 语法糖/类型

- 目标：补齐 `setup(props, ctx)` 的最小上下文（`emit/slots/attrs`），为长期 TSX 的组件复用与类型体验打地基。
- 价值：很多“Vue3 编译期好用的能力”本质依赖 ctx（尤其是 slots/emit）；没有 ctx，TSX 侧的语法糖与类型提升空间有限。
- 参考：`docs/plans/next-features-plan.md`（“组件 setup 上下文”）

### P1：Devtools/调试元信息的编译期注入（在现有能力基础上扩展）

- 目标：在开发态注入更可读的命名/定位信息，提升调试与排障效率（组件名、setup state key 命名等）。
- 现状：已具备“setup state 命名”的编译期改写能力，可沿同一技术路径扩展。
- 参考：`docs/plans/plan-tsx-compile-transform-devtools-names.md`

## 暂不建议优先做的能力（成本高/收益低）

- 模板编译器导向的优化：静态提升（hoist）、patchFlags、`v-once`、`v-memo` 等。
  - 原因：当前 `VirtualNode` 在挂载/patch 阶段会写入 `el/anchor/handle/component` 等运行时字段，天然不适合“复用 hoisted VNode”这类策略；若要做通常需要引入 clone 语义或调整运行时元信息的存储位置，工程成本与风险较高。
- 事件缓存（类似 cacheHandlers）：
  - 原因：DOM 事件目前已采用 invoker 模式维持监听引用稳定，编译期再缓存函数身份的边际收益有限。

## 关联计划索引

- props 解构：`docs/plans/plan-tsx-compile-transform-props-destructure.md`
- v-model（运行时现状/计划）：`docs/plans/plan-v-model-component.md`、`docs/plans/plan-v-model-jsx.md`
- Devtools 命名增强：`docs/plans/plan-tsx-compile-transform-devtools-names.md`
- 中长期功能排序（含 setup ctx / v-model 策略）：`docs/plans/next-features-plan.md`
