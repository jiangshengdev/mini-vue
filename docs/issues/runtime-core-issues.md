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

## 3. 首次渲染失败时 `mountComponent` 仍返回“空句柄”，可能误导调用方（已修复）

- 位置：
  - `src/runtime-core/mount/handle.ts`
  - `src/runtime-core/component/mount.ts`
  - `src/runtime-core/component/render-effect.ts`
- 原因：
  - 首渲染阶段同时存在两种会导致 `mounted.nodes` 为空数组的情况：
    - “空渲染但成功”（组件返回空值/布尔值/空 children，属于合法渲染结果）
    - “渲染失败”（首渲染抛错，被错误通道隔离以保证兄弟挂载不中断）
  - 若仅用 `MountedHandle | undefined` 作为信号，会把上述两种情况合并为同一结果，从而误导调用方。
- 修复：
  - 将 `MountedHandle` 直接扩展为带状态的句柄：新增 `ok: boolean` 字段，并保持始终可 `teardown()`。
  - 语义拆分为两维：
    - `ok`：本次挂载链路是否成功完成
    - `nodes`：本次挂载是否实际产生宿主节点
  - 行为示例：
    - 空渲染：`ok === true` 且 `nodes.length === 0`
    - 首渲染抛错：`ok === false` 且 `nodes.length === 0`（仍返回句柄以确保可清理 scope/effect）
- 测试：`test/runtime-core/component/mount-handle.test.tsx`

## 4. 未显式拒绝异步 `setup`，错误提示不够准确（已修复）

- 位置：
  - `src/runtime-core/component/setup.ts`
  - `src/shared/error-channel.ts`
- 现状（修复前）：`invokeSetup` 通过 `runSilent` 同步执行 `instance.type(instance.props)` 并要求返回渲染函数；当组件 `setup` 返回 Promise 时，会在错误通道层被拒绝，但提示为通用的 runner 错误信息，无法直观指向“异步 setup 不支持”。
- 修复：
  - 错误通道在识别到 thenable 且 `origin === componentSetup` 时，改为抛出更准确的错误：`暂不支持异步 setup：setup() 必须同步返回渲染函数（不要返回 Promise）`。
  - `setup` 入口同时引入 thenable 识别兜底，避免误落入“必须返回渲染函数”的通用分支。
- 测试：`test/runtime-core/component/mount-handle.test.tsx`

## 5. `mountChildWithAnchor` 依赖宿主对 Fragment 插入语义的隐式契约，类型未约束（已修复）

- 位置：`src/runtime-core/component/anchor.ts`、`src/runtime-core/renderer.ts`
- 现状：当需要锚点时，`mountChildWithAnchor` 会创建 `HostFragment`，把子树挂载到 fragment 上，再调用 `options.insertBefore(container, fragment, anchor)`。
- 影响：这要求宿主实现的 `insertBefore` 能“正确处理 fragment”：插入时应迁移 fragment 的子节点而不是插入 fragment 本身。该约束在 DOM 宿主下成立（`DocumentFragment` 的标准行为），但对其他宿主并非必然，且没有在 `RendererOptions` 的类型/注释层面强制或明确。
- 修复：
  - runtime-core 不再把 fragment 本身传给 `insertBefore`，改为收集子节点后逐个在锚点前插入，避免依赖宿主对 fragment 的特殊语义。
  - `RendererOptions.insertBefore` 注释明确 runtime-core 不会传入 `HostFragment` 作为 child。
- 测试：`test/runtime-core/component/anchor.test.ts`

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

## 9. `createRenderer` 使用 WeakMap 缓存容器句柄，限制 HostElement 必须为对象（待修复）

- 位置：`src/runtime-core/renderer.ts`
- 现状：渲染器内部用 `WeakMap` 以容器作为 key 缓存挂载句柄；`WeakMap` 的 key 必须是对象。
- 影响：若宿主环境将容器抽象为字符串/数字（例如终端渲染器、某些自定义渲染器），会在运行时报错 `Invalid value used as weak map key`，破坏“平台无关”的承诺。
- 提示：
  - 方案 A：约束类型（明确 HostElement 必须是 `object`）并在文档/类型层声明；
  - 方案 B：对对象 key 用 `WeakMap`、对原始值 key 用 `Map`（需要额外的生命周期清理策略）。

## 10. `mount` 失败时应用状态可能处于“idle 但已缓存 container”的不一致态（待修复）

- 位置：`src/runtime-core/create-app.ts`
- 现状：`mountApp` 在调用渲染器前就写入 `state.container = target`；若 render 抛错，则 `state.status` 仍为 `idle`，但 container 已被缓存。
- 影响：语义上状态不够一致，调试时可能困惑；但调用 `unmount()` 仍可清理容器，不属于必然的功能性错误。
- 提示：render 失败时在 `catch`/`finally` 中回滚 `state.container`，或引入更细的生命周期状态（如 `mounting`）。
