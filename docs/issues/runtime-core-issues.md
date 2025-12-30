# Runtime Core 模块问题记录

## 本轮审查补充

- 修复：「`shouldUseAnchor` 在 Fragment/数组子树中传染为 `true`，导致锚点滥用」，详见第 16 条。

## 1. 组件更新采用「卸载后重挂」导致状态丢失（已修复）

- 位置：`src/runtime-core/component/render-effect.ts`
- 修复：组件 `effect` 记录最新子树后，`rerenderComponent` 直接通过 `patchChild` 对新旧子树做 diff 并更新 `mountedHandle`，不再在更新前执行 teardown/remount；调度失败会回滚到旧子树，成功则复用已有宿主节点与子组件实例。
- 结果：组件更新可复用子树与 DOM，子组件状态、焦点/滚动等宿主态不再因重挂而丢失。

## 2. 更新流程在 render 成功前就卸载旧子树，失败时无法回滚（已修复）

- 位置：`src/runtime-core/component/render-effect.ts`
- 现状：`rerenderComponent` 在执行 `renderSchedulerJob` 生成新子树之前就卸载旧子树；若 `renderSchedulerJob` 抛错，会标记 `rerenderFailed` 并直接 `teardownComponentInstance`。
- 影响：一旦更新渲染失败，旧 DOM 已经被移除且不会恢复，最终该组件会被完整清理（表现为组件区域直接消失），属于不可恢复的破坏性更新。
- 提示：应当先尝试生成新子树（或至少确保 render 成功）后再替换挂载结果；若 render 失败，应保留旧子树与旧 DOM（或实现回滚策略）。
- 修复：rerender 时先运行 render 生成新子树，成功后再 teardown 旧子树并挂载；render 抛错会保留旧子树与 DOM。

## 3. 首次渲染失败时 `mountComponent` 仍返回「空句柄」，可能误导调用方（已修复）

- 位置：
  - `src/runtime-core/mount/handle.ts`
  - `src/runtime-core/component/mount.ts`
  - `src/runtime-core/component/render-effect.ts`
- 原因：
  - 首渲染阶段同时存在两种会导致 `mounted.nodes` 为空数组的情况：
    - 「空渲染但成功」（组件返回空值/布尔值/空 children，属于合法渲染结果）
    - 「渲染失败」（首渲染抛错，被错误通道隔离以保证兄弟挂载不中断）
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
- 现状（修复前）：`invokeSetup` 通过 `runSilent` 同步执行 `instance.type(instance.props)` 并要求返回渲染函数；当组件 `setup` 返回 Promise 时，会在错误通道层被拒绝，但提示为通用的 runner 错误信息，无法直观指向「异步 setup 不支持」。
- 修复：
  - 错误通道在识别到 thenable 且 `origin === componentSetup` 时，改为抛出更准确的错误：`暂不支持异步 setup：setup() 必须同步返回渲染函数（不要返回 Promise）`。
  - `setup` 入口同时引入 thenable 识别兜底，避免误落入「必须返回渲染函数」的通用分支。
- 测试：`test/runtime-core/component/mount-handle.test.tsx`

## 5. `mountComponentSubtreeWithAnchors` 依赖宿主对 Fragment 插入语义的隐式契约，类型未约束（已修复）

- 位置：`src/runtime-core/component/anchor.ts`、`src/runtime-core/renderer.ts`
- 现状：当需要锚点时，`mountComponentSubtreeWithAnchors` 会创建 `HostFragment`，把子树挂载到 fragment 上，再调用 `options.insertBefore(container, fragment, anchor)`。
- 影响：这要求宿主实现的 `insertBefore` 能「正确处理 fragment」：插入时应迁移 fragment 的子节点而不是插入 fragment 本身。该约束在 DOM 宿主下成立（`DocumentFragment` 的标准行为），但对其他宿主并非必然，且没有在 `RendererOptions` 的类型/注释层面强制或明确。
- 修复：
  - runtime-core 不再把 fragment 本身传给 `insertBefore`，改为收集子节点后逐个在锚点前插入，避免依赖宿主对 fragment 的特殊语义。
  - `RendererOptions.insertBefore` 注释明确 runtime-core 不会传入 `HostFragment` 作为 child。
- 测试：`test/runtime-core/component/anchor.test.ts`

## 6. `mountElement` 卸载阶段存在冗余 DOM remove（已修复）

- 位置：`src/runtime-core/mount/element.ts`
- 现状：`teardown` 中会先遍历 `mountedHandles` 并执行每个子句柄的 `teardown()`（子路径通常会调用宿主 `remove`），最后再对父元素本身执行一次 `remove(element)`。
- 影响：在 DOM 宿主下，移除父元素即可把整棵子树从 DOM 树摘除；此时对子节点逐个执行 remove 会产生额外的 $O(N)$ DOM 操作开销（仍需要保留子 teardown 的「逻辑清理」语义，如 ref/effect 等）。
- 提示：应区分「逻辑清理」与「DOM 摘除」，避免对子节点做重复的 DOM remove。

## 7. `mountChild` 数组分支的 `push(...nodes)` 在超大列表下可能触发 RangeError（已修复）

- 位置：`src/runtime-core/mount/child.ts`
- 现状：数组分支在收集子句柄节点时使用 `nodes.push(...mounted.nodes)`。
- 影响：当单个子项返回的 `mounted.nodes` 数量非常大时，展开运算符可能触发 JS 引擎的参数数量/栈限制，导致 `RangeError`（表现为「Maximum call stack size exceeded」或类似错误），属于输入规模相关的稳定性风险。
- 修复：改为逐个 `push` 收集子节点，避免对潜在大数组使用展开运算符。

## 8. `mountChild` 对象兜底渲染为 `[object Object]`，缺少开发期提示（已修复）

- 位置：`src/runtime-core/mount/child.ts`
- 修复：在开发模式下检测到对象子节点兜底渲染时输出警告，指引用户修正渲染输出，兜底行为仍保持字符串化。

## 9. `createRenderer` 使用 WeakMap 缓存容器句柄，限制 HostElement 必须为对象（已修复）

- 位置：`src/runtime-core/renderer.ts`
- 现状：渲染器内部用 `WeakMap` 以容器作为 key 缓存挂载句柄；`WeakMap` 的 key 必须是对象。
- 影响：若宿主环境将容器抽象为字符串/数字（例如终端渲染器、某些自定义渲染器），会在运行时报错 `Invalid value used as weak map key`，破坏「平台无关」的承诺。
- 修复：将 `HostElement` 类型约束为 `object`，并在运行期对非对象容器抛出明确错误提示，避免 WeakMap 报错。

## 10. 挂载失败时应用状态可能处于「空闲但已缓存容器」的不一致态（已修复）

- 位置：`src/runtime-core/create-app.ts`
- 修复：
  - 仅在渲染成功后才写入 `state.container` 与状态字段，render 抛错时保持两者为初始值，状态保持一致。
  - 失败后调用 `unmount()` 不会误触发宿主清理。
- 测试：`test/runtime-core/app/mount-failure-state.test.tsx`

## 11. 渲染抛错时容器可能残留部分挂载内容且无法通过 `unmount` 清理（已确认，已修复：ref 场景）

- 位置：
  - `src/runtime-core/create-app.ts`（`mountApp`）
  - `src/runtime-core/mount/element.ts`（`assignElementRef`）
- 现状：挂载中途若同步抛错，应用实例不会进入 mounted 状态，`unmount()` 无法触发宿主清理；同时容器可能已经写入部分节点。
- 复现：元素 `ref` 回调抛错会中断挂载并留下残留，见 `test/runtime-dom/error/ref.test.tsx`。
- 修复：`assignElementRef` 通过错误通道隔离 `ref` 赋值异常（新增 `errorContexts.elementRef`），避免打断挂载流程，从而保证后续 `unmount()` 可以清空容器。

## 12. 测试 Mock 内部文件路径（已优化）

- 位置：`test/runtime-core/patch/child.test.tsx`
- 修复：移除对 `@/runtime-core/patch/children.ts` 的 mock，改为通过宿主树插入顺序断言「新增子节点插入在 Fragment 结束锚点之前」，以验证 Fragment patch 锚点选择正确。
- 收益：不再依赖内部文件路径与调用栈，测试更抗重构。

## 13. 测试辅助函数重复定义（待优化）

- 位置：`test/runtime-core/patch/insertion.test.ts`
- 现状：文件内定义了 `createHostOptionsWithSpies` 辅助函数，其逻辑与 `patch/test-utils.ts` 中的 `createHostRenderer` 高度重复。
- 影响：增加了维护成本，逻辑分散。
- 提示：建议统一复用测试工具库 `test-utils.ts`。

## 14. 测试白盒断言内部状态（已优化）

- 位置：`test/runtime-core/provide-inject/provide-inject.test.ts`
- 修复：不再断言 `cause` 的具体快照（如 `{ currentInstance: undefined }`），仅断言会抛错且错误信息正确，并对 `cause` 做存在性/类型校验。
- 收益：减少对内部状态形状的依赖，避免重构实例上下文管理时测试误报。

## 15. keyed diff 对重复 key/逆序场景会残留多余节点（已修复）

- 位置：
  - `src/runtime-core/patch/keyed-children.ts`（`patchAlignedChildren`）
  - `src/runtime-core/patch/keyed-children-helpers.ts`（`findUnkeyedMatch`）
- 修复：`patchAlignedChildren` 写入 `newIndexToOldIndexMap` 前会检查占用，重复命中时卸载当前旧节点；`findUnkeyedMatch` 兜底复用无 key 节点时跳过已占用的新索引，避免同一新节点被多次复用，最终移动阶段按正确映射插入/复用。
- 回归验证：`test/runtime-core/patch/children-keyed.test.tsx`、`test/runtime-core/patch/children-keyed-regression.test.tsx` 覆盖重复 key 及逆序场景，确认不会残留额外宿主节点。

## 16. `shouldUseAnchor` 在 Fragment/数组路径下会被继承为全局 `true`（已修复）

- 位置：
  - `src/runtime-core/mount/child.ts`（`mountChild`/`mountArrayChild`）
  - `src/runtime-core/mount/virtual-node.ts`
  - `src/runtime-core/mount/children.ts`
  - `src/runtime-core/component/mount.ts`、`component/anchor.ts`
- 现状：
  - `mountChild` 读取父级 `context.shouldUseAnchor` 后直接转传给 `mountVirtualNode`；`Fragment` 分支再原样传给内部 `children`，导致父层设为 `true` 时子树层层继承。
  - 数组分支 `mountArrayChild` 对每个子项强制 `shouldUseAnchor: true`，不按本层兄弟关系重算。
  - 元素子节点路径会按索引重算 `shouldUseAnchor`，因此只有被数组/Fragment 包裹时会出现「一旦为真，后代皆真」。
- 影响：组件/Fragment/数组子树都会创建首尾锚点，甚至在本层没有后续兄弟时也会被迫使用，占用额外空文本节点与插入成本。
- 参考：Vue3 渲染器会在每层 children 遍历中独立计算是否需要锚点，Fragment/组件进入子树时不会继承父层需求。
- 修复：
  - 数组分支在遍历时按 `index < children.length - 1` 重算 `shouldUseAnchor`，不再一律 `true`。
  - Fragment 子树沿用数组重算策略，避免父层布尔传染到孙层。
- 影响范围：`src/runtime-core/mount/child.ts`
