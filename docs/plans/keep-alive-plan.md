# 计划：KeepAlive 内置组件

为 mini-vue 规划并落地 `runtime-core` 内置组件 `KeepAlive`：通过在 vnode 上标记 keep-alive 元数据，让 `mount/unmount` 分别走 `activate/deactivate`，并配套 `onActivated/onDeactivated` 生命周期、缓存淘汰策略与回归测试。

## Scope

- In: `KeepAlive` 组件实现、缓存与 LRU、激活/失活节点移动、`onActivated/onDeactivated` API、单元测试覆盖。
- Out: 完整 slots/动态组件语法糖、Transition/Suspense/Teleport 集成、SSR/水合、异步 setup、复杂多子节点缓存语义。

## Action items

[x] 梳理现有 `mount/patch/unmount/scheduler` 与生命周期实现，确定 KeepAlive 介入点与运行时字段设计（`src/runtime-core/mount/**`、`src/runtime-core/patch/**`、`src/runtime-core/component/**`）。  
[ ] 扩展运行时 vnode 元数据：为 keep-alive 增加最小字段（如 `shouldKeepAlive/keptAlive/keepAliveInstance`）与类型/守卫（`src/runtime-core/virtual-node.ts` 等）。  
[ ] 扩展组件生命周期：新增 `onActivated/onDeactivated` 注册 API、实例存储结构与 post flush 调度（`src/runtime-core/component/context.ts`、`src/runtime-core/component/lifecycle.ts`、`src/runtime-core/component/index.ts`、`src/runtime-core/index.ts`、`src/index.ts`）。  
[ ] 实现 `KeepAlive` 组件本体：维护 `cache: Map` + `keys: Set`（LRU），支持最小 `max/include/exclude`（可拆阶段），并在渲染期为子组件 vnode 写入 keep-alive 标记（建议新增 `src/runtime-core/components/keep-alive.ts` + `src/runtime-core/components/index.ts`）。  
[ ] 在 `mount` 路径支持 `keptAlive`：命中缓存时不新建实例，改为调用 `activate`（`move` 回实际容器 + 入队 activated hooks），并保持 `handle/nodes` 可复用（`src/runtime-core/mount/virtual-node.ts` 等）。  
[ ] 在 `unmount` 路径支持 `shouldKeepAlive`：不 teardown、不走宿主 `remove`，改为调用 `deactivate`（`move` 到 `storageContainer` + 入队 deactivated hooks）（`src/runtime-core/patch/utils.ts` 等）。  
[ ] 补齐缓存淘汰与卸载清理：`max` 超限 `prune` 时强制 teardown 被淘汰实例；KeepAlive 自身卸载时遍历 cache 全量 teardown，避免泄漏与残留标记。  
[ ] 补充测试与验证：新增 `test/runtime-core/component/keep-alive.test.tsx` 覆盖缓存复用、DOM move 不触发 `remove`、`activated/deactivated` 时序与父子顺序、LRU 淘汰；运行 `pnpm run test test/runtime-core/component/keep-alive.test.tsx`。

## Open questions

- `include/exclude` 匹配基于什么（函数名 `componentName` / 显式字段），以及首版是否先只做 `max` + `key/type` 缓存？
  - Vue3 官方：基于 `getComponentName(type)` 的「组件名」做匹配（对 async wrapper 取其已 resolve 的 inner component name）。
  - Vue3 支持的 pattern：`string | RegExp | (string | RegExp)[]`。
    - `string`：按逗号分隔后与 name 精确匹配（例如 `'A,B'`）。
    - `RegExp`：直接 `test(name)`。
    - `array`：任意元素匹配即命中。
  - 注意：如果组件没有 name，`include` 将无法命中（表现为不缓存）；`exclude` 只有在 name 存在时才可命中。

- `deactivated` 期间组件更新策略：继续 patch 到 `storageContainer`，还是暂停 effect 并在 `activate` 时补一次？
  - Vue3 官方：deactivate 时仅把 vnode 移入 `storageContainer`，并不会“冻结”组件更新；activate 时会把 vnode move 回真实容器，并对比「上次渲染的 instance.vnode」与「这次激活的 vnode」再执行一次 `patch(...)`，以确保 props/slots 等变化被应用。
  - 细节：deactivate 时会 `invalidateMount(instance.m/instance.a)`，避免把 mounted/activated 相关副作用在失活分支重复触发；同时通过 `isDeactivated` 标记让 `onActivated/onDeactivated` 具备“失活分支不触发”的语义。

- `children` 多个/非组件 child 的行为：仅取第一个组件并开发态警告，还是直接透传不做缓存？
  - Vue3 官方：要求“恰好一个组件子节点”。如果 `slots.default()` 返回多个 children：开发态 `warn('KeepAlive should contain exactly one component child.')`，并直接返回 children（不做缓存）。
  - 若唯一 child 不是组件（也不是 Suspense）：直接透传，不做缓存。

- 还需要明确的点（建议在实现前定版）
  - 缓存 key（已定）：首版照抄 Vue3，使用 `vnode.key ?? vnode.type`。
  - 组件名来源（已定）：只读 `type.name`（不支持 `Component.displayName` / 自定义字段）。
  - include/exclude 的刷新时机（已定）：与 Vue3 一致，在 include/exclude props 变化后以 `flush: 'post'` 触发 prune。
