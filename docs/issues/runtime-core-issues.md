# Runtime Core 模块问题记录

## 1. 组件更新采用“卸载后重挂”导致状态丢失（待修复）

- 位置：`src/runtime-core/component/render-effect.ts`
- 现状：`rerenderComponent` 每次更新都先执行 `teardownMountedSubtree(instance)`，然后重新运行调度任务生成子树，最后再 `mountLatestSubtree` 把最新子树重新挂载。
- 影响：
  - 组件更新无法复用既有子树，子组件实例与其内部状态会被整体销毁并重建（如 `ref`、`reactive` 数据、effect/watch 等）。
  - DOM 也会被移除后重建，导致焦点、滚动位置、输入法组合态等瞬态状态丢失。
- 提示：需要引入“子树 patch/复用”机制（而非全量 teardown/remount），至少应做到在同一组件实例下对新旧子树做差量更新。

## 2. 更新流程在 render 成功前就卸载旧子树，失败时无法回滚（待修复）

- 位置：`src/runtime-core/component/render-effect.ts`
- 现状：`rerenderComponent` 在执行 `renderSchedulerJob` 生成新子树之前就卸载旧子树；若 `renderSchedulerJob` 抛错，会标记 `rerenderFailed` 并直接 `teardownComponentInstance`。
- 影响：一旦更新渲染失败，旧 DOM 已经被移除且不会恢复，最终该组件会被完整清理（表现为组件区域直接消失），属于不可恢复的破坏性更新。
- 提示：应当先尝试生成新子树（或至少确保 render 成功）后再替换挂载结果；若 render 失败，应保留旧子树与旧 DOM（或实现回滚策略）。

## 3. 首次渲染失败时 `mountComponent` 仍返回“空句柄”，可能误导调用方（待修复）

- 位置：`src/runtime-core/component/mount.ts`
- 现状：`mountComponent` 在 `setupComponent` 成功后调用 `performInitialRender`；但 `performInitialRender` 内部使用 `runSilent` 捕获错误，失败时可能返回 `undefined`。此时 `mountComponent` 仍会返回一个 `MountedHandle`，其中 `nodes` 被兜底为空数组。
- 影响：调用方无法区分“挂载成功但无节点”与“挂载失败未产生任何 DOM”，并可能继续把该句柄写入缓存或参与后续卸载流程，造成语义混淆。
- 提示：当 `performInitialRender` 返回 `undefined` 时，`mountComponent` 应当返回 `undefined`（或抛错/向上传播失败），并确保实例已被清理。

## 4. 未显式拒绝异步 `setup`，错误提示不够准确（待修复）

- 位置：`src/runtime-core/component/setup.ts`
- 现状：`invokeSetup` 直接执行 `instance.type(instance.props)` 并要求返回渲染函数；当组件 `setup` 返回 Promise 时，会落入 `typeof render !== 'function'` 分支并抛出通用错误“组件必须返回渲染函数...”。
- 影响：对“异步 setup 不被支持”的场景缺乏明确报错，定位成本更高。
- 提示：在 `invokeSetup` 中显式识别 Promise（或 thenable），并抛出更具体的错误（例如“当前实现不支持异步 setup”），避免误导为“没有返回 render function”。

## 5. `mountChildWithAnchor` 依赖宿主对 Fragment 插入语义的隐式契约，类型未约束（待修复）

- 位置：`src/runtime-core/component/anchor.ts`、`src/runtime-core/renderer.ts`
- 现状：当需要锚点时，`mountChildWithAnchor` 会创建 `HostFragment`，把子树挂载到 fragment 上，再调用 `options.insertBefore(container, fragment, anchor)`。
- 影响：这要求宿主实现的 `insertBefore` 能“正确处理 fragment”：插入时应迁移 fragment 的子节点而不是插入 fragment 本身。该约束在 DOM 宿主下成立（`DocumentFragment` 的标准行为），但对其他宿主并非必然，且没有在 `RendererOptions` 的类型/注释层面强制或明确。
- 提示：
  - 明确 `insertBefore` 的语义约束（文档/类型注释）以覆盖 fragment 行为；或
  - 在 runtime-core 层避免把 fragment 当作可插入节点，改为显式逐个插入 fragment 的 children（需要额外的宿主能力以遍历 fragment 内容）。
