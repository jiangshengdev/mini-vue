# 计划：watch 调度接入与异步语义对齐

在保持 `createWatch` 纯响应式默认同步的前提下，为 runtime 封装的 `watch` 接入调度器 pre/post 队列，按 Vue 官方三段队列顺序执行，并补齐排序、清理与回退用例。

## Scope

- In：runtime 层 `watch` 封装与调度接入、pre/post 队列区分与排序、组件作用域清理、纯 reactivity 回退、测试覆盖与验证。
- Out：文档/playground 更新、生命周期钩子实现、性能优化。

## Action items

- [x] 梳理当前 `createWatch`/`watch` 流程与调度器，确定封装层默认 `flush: 'pre'` 和 pre/post 目标队列，保留 `sync` 同步。
- [x] 实现 runtime 封装 `watch`：调用 `createWatch`，根据 `flush` 选择 `queuePreFlushCb`/`queuePostFlushCb`/同步执行；无调度器时 `pre/post` 退化为微任务占位。
- [x] 确认组件内 watcher 随组件 `effectScope` 自动清理（`createWatch` 已通过 `recordEffectScope`/`recordScopeCleanup` 注册），无需额外挂载；必要时补测试验证。
- [x] 在调度器中明确 pre/post 队列执行顺序（`pre → render jobs → post`），确保 `nextTick` 复用当前 flush Promise。
- [x] 补充单测：纯 reactivity 同步与 `pre/post` 回退、runtime 下 `pre/post` 相对组件渲染/`nextTick` 排序、混合 flush 去重、`onWatcherCleanup` 与 stop 行为。
- [ ] 运行 watch 与 runtime-core 相关测试，最终跑 `pnpm run test` 验证无回归。
