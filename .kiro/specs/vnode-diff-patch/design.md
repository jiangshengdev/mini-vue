# VNode Diff / Patch — Design

## 1. 现状与问题定位

- 组件更新：`src/runtime-core/component/render-effect.ts` 在 rerender 时执行 `teardownMountedSubtree` 再重新挂载，导致 DOM/子组件实例重建。
- 根渲染：`src/runtime-core/renderer.ts` 每次 render 先 clear 容器，无 root patch。
- mount 模型：当前 mount 返回 `MountedHandle`（`nodes[] + teardown()`），但 VNode 本身不携带宿主节点引用。
- DOM props：`src/runtime-dom/patch-props.ts` 当前实现只“写入 next”，无法可靠移除旧 props/解绑事件。

## 2. 总体方案

### 2.1 关键原则

- runtime-core 负责 diff/patch 与节点移动；宿主负责最小原语（create/insert/remove/patchProps/setText）。
- JSX 的 `VirtualNode` 类型保持“平台无关、无宿主引用”；宿主引用由 runtime-core 内部的运行时结构维护。
- 更新失败不破坏上一轮 DOM：仍遵循“先生成新子树，成功后再替换/patch”的顺序。

### 2.2 渲染原语扩展（RendererOptions）

在 `src/runtime-core/renderer.ts` 的 `RendererOptions` 扩展：

- `setText(node: HostNode, text: string): void`
- `patchProps(element: HostElement, prevProps?: PropsShape, nextProps?: PropsShape): void`

设计要点：

- `patchProps` 必须支持：
  - 移除 prev 中有、next 中无（或 next 为 null/false）的属性
  - `class/style` 覆盖与清空
  - 事件监听更新/解绑（需要 invoker 缓存）

### 2.3 runtime-core 的 vnode 运行时信息

引入 runtime-core 内部结构（建议命名 `RuntimeVNode` / `MountedVNode`）：

- `el: HostNode | HostElement`：Text/Element 的宿主节点引用
- `anchor?: HostNode`：Fragment/数组 children 的结束锚点
- `component?: ComponentInstance`：组件 vnode 的实例引用（用于复用实例）

说明：

- 这些字段是 runtime-core 内部实现细节，不上浮到 `src/jsx-foundation/types.ts`。

### 2.4 patch 入口与分派

新增 `patchChild(old, next, container, anchor?)` 作为统一入口：

- same 判定：virtual node 以 `type + key`；Text 以“都是文本”。
- 分派：Text / Element / Fragment(数组) / Component。

#### Text patch

- 复用旧 TextNode：`setText(old.el, String(next))`。

#### Element patch

- 复用旧 element：`next.el = old.el`。
- `options.patchProps(el, old.props, next.props)`。
- children：走 `patchChildren(old.children, next.children, el)`。

#### Fragment/数组 children patch

- 需要边界 anchors（start/end）限制更新范围。
- 在边界内执行 children diff，并使用 `insertBefore` 进行移动/插入。

#### Component patch

- 复用组件实例，不再 teardown。
- 将新 vnode props 更新到 instance，然后触发 rerender（effect 调度仍保持现状；scheduler 在另一个 spec）。
- 子树从“卸载+重挂”改为 `patch(oldSubTree, newSubTree, container, anchor)`。

## 3. children diff 算法（Vue 3 风格）

### 3.1 Phase A：无 key（按索引对齐）

- patch 公共长度区间
- mount 新增尾部
- unmount 旧的尾部

### 3.2 Phase B：有 key（头尾同步 + key map，中间区间移动）

- 头部同步（从左到右）
- 尾部同步（从右到左）
- 中间区间：建立 `key → newIndex`，遍历 old 做匹配 patch / unmount
- 再遍历 new：mount 不存在的
- 移动：
  - 基础实现：从后往前 `insertBefore` 到正确 anchor（保证语义正确）
  - 可选优化：对 newIndexToOldIndex 求 LIS，减少移动

## 4. 错误处理

- 保持现有 rerender 的“先 run renderSchedulerJob 成功，再进行替换/patch”的顺序。
- render 抛错：恢复 `instance.subTree = previousSubTree` 并退出，不触碰已挂载 DOM。

## 5. 单元测试策略

- 优先添加能证明“未重建”的断言：
  - TextNode/Element 引用不变
  - 事件监听不叠加
  - key 移动只移动不重建
- 以 `test/runtime-core/**` + `test/runtime-dom/**` 为主；必要时加少量集成用例。
