# runtime-core patch 优化计划

目标：减少 runtime-core 在 patch 过程中对 DOM/宿主的无意义写入，确保仅变更的部分触发宿主操作，缓解交互时「整体刷新」的观感。

## Scope

- In：`src/runtime-core/patch` 范围的 diff 与属性更新逻辑；必要的单测调整/补充。
- Out：运行时对外 API 变更、编译期/模板层优化、Playground UI。

## Action items

- [x] 复核 `patchElement` 与 `patchProps`：确认当前 props 对比是否存在相等值重复写入，整理 class/style/attr/event 的短路需求。
- [x] 文本/属性短路：为 `setText`、`patchProps` 内的 attr/class/style/事件绑定增加「前后相等跳过」策略，避免重复写入宿主。
- [x] props 等值短路替代 DOM 读取：基于 previous/next props 直接判断 class/style/attr 是否需要更新，减少对宿主的读取依赖，并补充覆盖用例。
- [x] 子树移动检查：查看 Fragment/children diff 是否存在无差别移动或写入，记录是否需要调整。
- [ ] 如需改动，更新 `src/runtime-core/patch/*.ts` 实现，保持类型与接口稳定。
- [x] 补充或调整单测（Text、attr/class/style、事件更新等），覆盖「未变更不触发 DOM 写」的断言。
- [x] 运行相关测试（至少 runtime-core patch 及 runtime-dom props/text 渲染用例），确认无回归。

## Open questions

- `patchProps` 内部目前是否已有等值短路？哪些宿主写入最容易重复（class/style/事件）？→ 已用 props 层等值替代 DOM 读取的短路（class/style/attr），事件已走引用对比；children 移动用例覆盖未发现多余操作。
