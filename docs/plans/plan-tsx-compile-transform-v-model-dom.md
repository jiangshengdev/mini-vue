# Plan

为 TSX 场景补齐“DOM 表单 v-model 的编译期展开”：按元素类型将 `v-model` 展开为 `value/checked` + `onInput/onChange`（必要时含 `multiple/select` 细分），并将该能力按 P 分阶段落地；同时保留 `runtime-dom` 对 `'v-model'` 的运行时兜底，用于动态标签与第三方产物。

## Scope

- In:
  - 仅 TS/TSX（Vite transform）层面的 source-to-source 改写，不引入模板/SFC 编译器。
  - 目标是 DOM 表单（`input/textarea/select`）的受控 props 展开，不涉及组件 `v-model`（组件写回见 `docs/plans/plan-tsx-compile-transform-v-model-writeback.md`）。
  - 分阶段推进：P0 先覆盖文本类，P1 扩展 checkbox/radio，P2 扩展 select 单/多选与动态 `type`。
  - 默认开启：作为 `miniVueCompilerPlugin` 的默认 feature 随编译期套件启用。
  - 可配置关闭：通过 `miniVueCompilerPlugin({ vModelDom: false })` 显式关闭（对齐现有 feature 约定：`false` 表示禁用、`options/undefined` 表示启用）。
  - 复用告警文案：编译期展开的冲突检测与非表单元素告警应复用 `runtime-dom` 现有文案与覆盖规则，避免同一写法出现两套提示。
- Out:
  - modifiers、`true-value/false-value`、`.lazy/.trim/.number` 等完整指令语义。
  - 完整对齐 Vue3 原生表单在边界行为上的所有细节（首版只保证核心写回链路与一致性）。

## Action items

[ ] 盘点现状与目标：梳理 `runtime-dom` 当前消费 `'v-model'` 的转换能力（`src/runtime-dom/props/v-model/**`），明确编译期展开“与运行时转换等价”的最小集合。  
[ ] 明确展开策略：在 TSX 编译期识别内置标签名（静态 `input/textarea/select`），对其他/动态标签保持原样，让 `runtime-dom` 兜底。  
[ ] P0：支持文本类输入展开（`input` 非 checkbox/radio + `textarea`）。

- 生成：`value={readModelValue(binding)}` + `onInput={(e) => setModelValue(binding, e.target.value)}` 的等价形态（或复用现有 `applyTextLikeModelBinding` 的规则但以编译期输出表达）。
- 冲突处理：当用户显式传了 `value/onInput`，复用运行时的冲突检测与告警文案/覆盖策略。  
  [ ] P1：支持 `input[type=checkbox]` / `input[type=radio]` 展开。
- 对齐运行时：checkbox 支持 boolean/array；radio 支持 strict equal 匹配；事件默认 `onChange`（按现有实现）。
- 诊断：无法静态判定 `type` 时不展开（留到 P2）。  
  [ ] P2：支持 `select`（单选/多选）与 `input` 动态 `type`。
- `select[multiple]`：对齐运行时“初始化选中态与写回”规则。
- 动态 `type`：仅在能静态归类时展开，否则回退到运行时 `v-model`（保持行为一致）。  
  [ ] 补齐互链与说明：在 `docs/plans/plan-v-model-jsx.md` 与 `docs/plans/v-model-jsx-impl.md` 增加“编译期展开是可选增强、运行时兜底仍保留”的说明，并与本计划互链。  
  [ ] 明确验证清单（用于后续实现）：列出每类表单的最小回归场景（初始化值一致、交互写回、冲突告警、动态标签回退），以及预期新增的测试位置（`test/vite-plugin/**` 与现有 `test/runtime-dom/props/v-model.test.tsx` 的对照用例）。

## Open questions

- 首版保持“只支持 `false` 关闭 + 默认全量启用”。
- 后续如发现需要更细粒度的开关（例如仅启用部分元素、或仅在 dev 生效），再集中收集问题并统一讨论与落盘。
