# 计划：KeepAlive 内置组件

为 mini-vue 规划并落地 `runtime-core` 内置组件 `KeepAlive`：通过在 vnode 上标记 keep-alive 元数据，让 `mount/unmount` 分别走 `activate/deactivate`，并配套 `onActivated/onDeactivated` 生命周期、缓存淘汰策略与回归测试。

## Scope

- In: `KeepAlive` 组件实现、缓存与 LRU、激活/失活节点移动、`onActivated/onDeactivated` API、单元测试覆盖。
- Out: 完整 slots/动态组件语法糖、Transition/Suspense/Teleport 集成、SSR/水合、异步 setup、复杂多子节点缓存语义。

## Action items

[ ] 梳理现有 `mount/patch/unmount/scheduler` 与生命周期实现，确定 KeepAlive 介入点与运行时字段设计（`src/runtime-core/mount/**`、`src/runtime-core/patch/**`、`src/runtime-core/component/**`）。  
[ ] 扩展运行时 vnode 元数据：为 keep-alive 增加最小字段（如 `shouldKeepAlive/keptAlive/keepAliveInstance`）与类型/守卫（`src/runtime-core/virtual-node.ts` 等）。  
[ ] 扩展组件生命周期：新增 `onActivated/onDeactivated` 注册 API、实例存储结构与 post flush 调度（`src/runtime-core/component/context.ts`、`src/runtime-core/component/lifecycle.ts`、`src/runtime-core/component/index.ts`、`src/runtime-core/index.ts`、`src/index.ts`）。  
[ ] 实现 `KeepAlive` 组件本体：维护 `cache: Map` + `keys: Set`（LRU），支持最小 `max/include/exclude`（可拆阶段），并在渲染期为子组件 vnode 写入 keep-alive 标记（建议新增 `src/runtime-core/components/keep-alive.ts` + `src/runtime-core/components/index.ts`）。  
[ ] 在 `mount` 路径支持 `keptAlive`：命中缓存时不新建实例，改为调用 `activate`（`move` 回实际容器 + 入队 activated hooks），并保持 `handle/nodes` 可复用（`src/runtime-core/mount/virtual-node.ts` 等）。  
[ ] 在 `unmount` 路径支持 `shouldKeepAlive`：不 teardown、不走宿主 `remove`，改为调用 `deactivate`（`move` 到 `storageContainer` + 入队 deactivated hooks）（`src/runtime-core/patch/utils.ts` 等）。  
[ ] 补齐缓存淘汰与卸载清理：`max` 超限 `prune` 时强制 teardown 被淘汰实例；KeepAlive 自身卸载时遍历 cache 全量 teardown，避免泄漏与残留标记。  
[ ] 补充测试与验证：新增 `test/runtime-core/component/keep-alive.test.tsx` 覆盖缓存复用、DOM move 不触发 `remove`、`activated/deactivated` 时序与父子顺序、LRU 淘汰；运行 `pnpm run test test/runtime-core/component/keep-alive.test.tsx`。  

## Open questions

- `include/exclude` 匹配基于什么（函数名 `componentName` / 显式字段），以及首版是否先只做 `max` + `key/type` 缓存？
- `deactivated` 期间组件更新策略：继续 patch 到 `storageContainer`，还是暂停 effect 并在 `activate` 时补一次？
- `children` 多个/非组件 child 的行为：仅取第一个组件并开发态警告，还是直接透传不做缓存？

