# VNode Diff / Patch — Tasks

> 说明：任务按「可回退的小步」拆分，尽量每步都有可验证的测试。状态字段按 Kiro 习惯可后续更新为 in-progress/completed。

## Phase 0：准备与对齐

- [ ] 0.1 复核现有 mount/unmount 边界语义
  - 目标：明确 `mountChildWithAnchor`、数组 children start/end anchors、以及 `MountedHandle.teardown(skipRemove)` 的期望语义。
  - 输出：在本 spec 的 design 中补充任何遗漏的边界约束（如：anchor 是否允许为 TextNode）。

## Phase 1：宿主原语补齐（Text patch 前置）

- [ ] 1.1 扩展 `RendererOptions`：新增 `setText`
  - 文件：`src/runtime-core/renderer.ts`
  - 变更：在接口中增加 `setText(node, text)`。
  - 验收：TypeScript 编译通过；runtime-dom renderer options 提供实现。

- [ ] 1.2 DOM 宿主实现 `setText`
  - 文件：`src/runtime-dom/renderer-options.ts`（或实际注入 options 的位置）
  - 变更：对 Text 节点调用 `node.nodeValue = text` 或等价方式。
  - 测试：新增/更新 runtime-dom 用例验证文本更新。

## Phase 2：props patch 语义升级（支持移除与事件更新）

- [ ] 2.1 升级 `patchProps` 签名为 `(el, prevProps, nextProps)`
  - 文件：`src/runtime-core/renderer.ts`（接口）、`src/runtime-dom/patch-props.ts`（实现）、以及所有调用点（如 `mountElement`）。
  - 变更：
    - mount 时调用 `patchProps(el, undefined, nextProps)`。
    - patch 时调用 `patchProps(el, prevProps, nextProps)`。

- [ ] 2.2 runtime-dom：实现属性移除与 class/style 清空
  - 文件：`src/runtime-dom/patch-props.ts`
  - 验收：
    - prev 有、next 无的 attr 被移除
    - `style` 从对象/字符串变为空时能清空
    - `class` 从有值变为空时能清空

- [ ] 2.3 runtime-dom：事件更新不叠加（invoker 缓存）
  - 文件：`src/runtime-dom/patch-props.ts`
  - 建议实现：为 element 上的事件维护 `key -> invoker` 缓存；更新时只替换 invoker 内部引用；移除时 removeEventListener。
  - 测试：
    - 更新 onClick 后只触发最新 handler
    - 多次更新不会累积多次触发

## Phase 3：引入 patch 入口（先 Text + Element）

- [ ] 3.1 增加 runtime-core 内部「带宿主引用」的 vnode 运行时结构
  - 文件：建议新增 `src/runtime-core/vnode.ts`（或放在 mount 子域内）
  - 内容：定义 `RuntimeVNode`（包含 `el/anchor/component` 等运行时字段）。
  - 验收：不修改 `src/jsx-foundation/types.ts` 的对外类型。

- [ ] 3.2 `mount` 写入 `el`（Text 与 Element）
  - 文件：`src/runtime-core/mount/child.ts`、`src/runtime-core/mount/element.ts`
  - 变更：
    - 文本 mount 后记录对应宿主节点引用
    - Element mount 后记录宿主 element
  - 说明：如果不想改 public vnode，可通过 runtime-core 侧 map/side-table 维护 vnode->node 的关联。

- [ ] 3.3 新增 `patchChild`（Text/Element 分支）
  - 文件：建议新增 `src/runtime-core/patch/index.ts`（或 `src/runtime-core/patch/child.ts`）
  - 功能：
    - Text↔Text：`setText`
    - Element↔Element：`patchProps(prev,next)` + `patchChildren`（Phase A）
    - 其他类型切换：replace（unmount old + mount next 到 anchor 前）
  - 测试：
    - 更新文本不重建 TextNode
    - Element 更新 props 不重建 Element

## Phase 4：children patch（无 key → 有 key）

- [ ] 4.1 实现 `patchChildren` Phase A（索引对齐）
  - 文件：`src/runtime-core/patch/children.ts`
  - 验收：追加/截断正确，公共区间复用。
  - 测试：覆盖追加/截断 + 嵌套 element。

- [ ] 4.2 增加 Fragment/数组 children 的边界表示并支持 patch
  - 文件：`src/runtime-core/mount/child.ts`（数组分支）与 patch 侧实现
  - 目标：复用 start/end anchors，在边界内执行 children patch。
  - 测试：兄弟节点顺序不被破坏。

- [ ] 4.3 实现 keyed diff Phase B（头尾同步 + key map）
  - 文件：`src/runtime-core/patch/keyed-children.ts`
  - 验收：插入/删除/移动语义正确；稳定 key 下节点复用。
  - 测试：
    - 仅移动：节点引用不变
    - 插入/删除：只影响对应节点

- [ ] 4.4（可选）加入 LIS 优化减少移动
  - 验收：同样语义下减少 `insertBefore` 次数（可用 spy 统计）。

## Phase 5：组件更新改为 patch 子树

- [ ] 5.1 在组件 rerender 中改用 patch
  - 文件：`src/runtime-core/component/render-effect.ts`
  - 变更：
    - render 成功后：对 `previousSubTree` 与 `instance.subTree` 执行 patch，而不是 `teardownMountedSubtree + mountLatestSubtree`
    - 保留更新失败时的「回退 previousSubTree」逻辑
  - 测试：
    - 子组件实例不重建（可用计数/引用断言）
    - 更新失败不破坏旧 DOM（已有语义需保持）

## Phase 6（可选）：root render 走 patch（取消 clear）

- [ ] 6.1 renderer 保存 root vnode 并执行 patch
  - 文件：`src/runtime-core/renderer.ts`
  - 变更：
    - `WeakMap<container, RootState>` 里存储 root vnode/handle
    - render 时 `patch(oldRoot, newRoot)`，仅首次 mount 才 clear
  - 测试：多次 `render()` 不会 clear 导致状态丢失。

## 可选：Property-based tests（PBT）

- [ ] P1 为「keyed diff 保序与复用」提取性质并引入 PBT（可选）
  - 说明：如果引入 fast-check，会新增依赖；也可以先用随机生成的 example-based 测试替代。
  - 性质示例：
    - 对任意 key 列表变换，最终 DOM 顺序与新 children 顺序一致
    - 对任意稳定 key 的纯移动，节点引用集合不变
