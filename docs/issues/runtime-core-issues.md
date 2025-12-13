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
- 现状：`mountComponent` 在 `setupComponent` 成功后调用 `performInitialRender`。由于 `performInitialRender` 使用 `runSilent` 隔离首渲染异常：
  - 当组件渲染结果“本来就不产生节点”（例如返回 `null`/`false`/空数组等）时，子树挂载会自然得到 `undefined`（属于“空渲染但成功”的语义）。
  - 当组件首渲染抛错时，`runSilent` 也会返回 `undefined`（属于“渲染失败”的语义）。
    当前 `mountComponent` 为了始终提供 teardown 入口，会在 `mounted` 为 `undefined` 时仍返回一个 `MountedHandle`，并将 `nodes` 兜底为空数组。
- 影响：调用方无法区分“空渲染但成功”与“渲染失败被吞掉”，可能错误地把失败当成空渲染继续缓存；反之，如果简单把 `mounted === undefined` 当作失败并直接返回 `undefined`，又会回归“空组件/空渲染没有 teardown 句柄，导致子组件 scope/effect 无法被回收”的问题。
- 注意：该问题是为了解决“首渲染异常不应中断兄弟挂载/整棵树挂载流程”与“空组件仍需可卸载（避免泄露）”而产生的副作用。修复时不能通过让异常向外抛出、或用 `return undefined` 统一表示失败来处理，否则容易回归上述原问题。
- 提示：需要把“是否成功”与“是否产生节点”拆成两个维度。
  - 可选方案：让组件挂载返回“带状态的句柄”（例如 `{ ok: true, handle }` / `{ ok: false, handle? }`，或 `MountedHandle & { ok: boolean }`），并保持即便 `nodes=[]` 也有 teardown。
  - 或使用判别联合（discriminated union）返回结果，把错误 token/原因显式透出，同时不改变“空渲染仍可卸载”的行为。

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

## 6. `mountElement` 卸载阶段存在冗余 DOM remove（待修复）

- 位置：`src/runtime-core/mount/element.ts`
- 现状：`teardown` 中会先遍历 `mountedHandles` 并执行每个子句柄的 `teardown()`（子路径通常会调用宿主 `remove`），最后再对父元素本身执行一次 `remove(element)`。
- 影响：在 DOM 宿主下，移除父元素即可把整棵子树从 DOM 树摘除；此时对子节点逐个执行 remove 会产生额外的 $O(N)$ DOM 操作开销（仍需要保留子 teardown 的“逻辑清理”语义，如 ref/effect 等）。
- 提示：应区分“逻辑清理”与“DOM 摘除”，避免对子节点做重复的 DOM remove。

## 7. `mountChild` 数组分支的 `push(...nodes)` 在超大列表下可能触发 RangeError（待修复）

- 位置：`src/runtime-core/mount/child.ts`
- 现状：数组分支在收集子句柄节点时使用 `nodes.push(...mounted.nodes)`。
- 影响：当单个子项返回的 `mounted.nodes` 数量非常大时，展开运算符可能触发 JS 引擎的参数数量/栈限制，导致 `RangeError`（表现为“Maximum call stack size exceeded”或类似错误），属于输入规模相关的稳定性风险。
- 提示：应避免对潜在大数组使用展开运算符，改用循环或分段追加。

## 8. `mountChild` 对象兜底渲染为 `[object Object]`，缺少开发期提示（待修复）

- 位置：`src/runtime-core/mount/child.ts`
- 现状：当 `child` 既不是 `VirtualNode`、也不是字符串/数字、也不是数组时，会走兜底逻辑 `String(child)` 创建文本节点。
- 影响：对象等复杂值会被渲染为 `[object Object]`，通常并非用户期望；同时缺少开发环境下的告警/指引，排查成本较高。
- 提示：在 dev 模式输出明确警告，或提供更合理的序列化策略。
