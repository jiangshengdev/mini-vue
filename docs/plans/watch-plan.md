# 计划：watch 行为对齐（reactivity 范畴）

聚焦 `watch` 本身的语义对齐与健壮性，保持基础响应式层的同步特征。flush 语义暂以最小 API 退化方案处理（必要时用微任务占位），不牵涉组件调度或 nextTick。

## Scope

- In：`watch` API 行为与选项（同步/flush）、内部调度与清理、对应单测覆盖。
- Out：组件调度/nextTick/生命周期、文档与 playground 更新。

## Action items

[ ] 梳理现有 `watch` 实现与官方语义差异（同步触发、首跑、deep/immediate 行为）。  
[ ] 设计/实现 `watch` 的 `flush` 选项：默认同步；支持 `sync`/`pre`/`post`，首跑同步；未接入 runtime 队列时使用微任务占位保持语义，保持最小 API。  
[ ] 确保清理与 stop 行为一致：回调抛错、cleanup 抛错走错误通道且不阻断后续。  
[ ] 补充/更新 `watch` 单测：基础同步触发、`immediate`、`deep`、`cleanup`、`flush` 选项覆盖、自定义 scheduler 覆盖。  
[ ] 运行相关 `watch` 测试（Vitest 目标文件）验证回归与边界。

## 决策确认

- flush: pre/post 采用微任务占位，不接入全局队列，首跑同步。  
- 不引入 Vue 的 `options.call`/`onError` 扩展，保持最小 API。  
- 对外暴露 `flush` 选项以覆盖默认同步语义，其余保持最简。
