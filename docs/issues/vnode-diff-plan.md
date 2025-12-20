# VirtualNode Diff / Patch 方案（独立设计稿）

> 目的：把「组件更新全量卸载重建」改为「复用旧子树并在原地 patch」，并为后续 scheduler/nextTick/lifecycle 留出合理接口。

## 背景与现状

- 当前组件更新路径：`rerenderComponent` 会 `teardownMountedSubtree(instance)` 后再 `mountLatestSubtree(...)`，导致 DOM/子组件实例全部重建。
- 当前根渲染路径：`createRenderer.render()` 会 `clear(container)`，没有 root 级 patch。
- 当前 props 写入语义：runtime-dom 的 `patchProps(element, props?)` 只「写 next」，无法可靠移除旧 props/解绑旧事件，无法支撑 Element patch。
- 当前宿主原语缺口：缺少更新 Text 的原语（只有 `createText`）。
- 当前 VirtualNode 结构：`src/jsx-foundation/types.ts` 的 `VirtualNode` 不包含宿主节点引用（无 `el`），runtime-core 无法从新旧 virtualNode 直接定位要复用的 DOM。

## 设计目标（MVP）

- 组件更新：同一组件实例下，新旧子树走 `patch(oldSubTree, newSubTree)`，不再 teardown/remount。
- Element 复用：同层同类型（`type`）且同 key 的元素/组件可复用；属性与 children 增量更新。
- children diff：
  - 先支持无 key 的「按索引对齐」（最小可用）。
  - 再支持有 key 的增删移动（Vue 3 风格：头尾同步 + key map，中间区间按需移动；LIS 可选）。

## 非目标（先不做）

- Teleport/Suspense/异步组件。
- 完整的 Fragment 形态化 virtualNode（仍允许 RenderOutput 数组作为 Fragment 语义）。
- 最少移动（LIS）作为强制要求；可先保证语义正确。

## 核心决策

### 1) runtime-core 内部 virtualNode 运行时字段（不改对外 JSX 类型）

建议在 runtime-core 侧定义「带宿主引用」的内部结构（例如 `RuntimeVirtualNode`），避免污染 `src/jsx-foundation/types.ts`：

- `el: HostNode | HostElement`：Text/Element 对应的宿主节点
- `anchor?: HostNode`：Fragment/数组 children 的结束锚点
- `component?: ComponentInstance`：组件 virtualNode 对应实例（复用实例）

> 说明：把宿主引用留在 runtime-core，可以保持 JSX/VirtualNode 工厂纯净，同时让 patch 能拿到 DOM。

### 2) RendererOptions 扩展（为 patch 提供必需原语）

在 `src/runtime-core/renderer.ts` 的 `RendererOptions` 增加：

- `setText(node: HostNode, text: string): void`
- `patchProps(element: HostElement, prevProps?: PropsShape, nextProps?: PropsShape): void`

要求：

- `patchProps` 必须支持 **移除旧属性**、**更新/解绑事件**、以及 `class/style` 的覆盖与清空。
- runtime-dom 侧需要引入「事件 invoker/缓存」模式（避免每次更新都 addEventListener 且无法 remove 旧 listener）。

### 3) patch 入口与复用规则

新增 `patchChild(old, next, container, anchor?)`（命名可调整）作为统一入口。

- same virtualNode 判定：
  - virtual node：`type` 相同且 `key` 相同
  - 文本：都为 Text（string/number）

分派规则：

- Text ↔ Text：复用 `el`，调用 `setText`。
- Element ↔ Element：
  - 复用 `el`
  - `patchProps(el, old.props, next.props)`
  - `patchChildren(old.children, next.children, el)`
- Fragment/数组 children：
  - 需要边界（start/end anchors）来限制 patch 范围
  - 在边界内跑 children diff
- Component ↔ Component：
  - 复用旧 `ComponentInstance`
  - 更新 props（需要定义「props 更新」如何触发 effect rerender）
  - 子树更新从「teardown+mount」改为 `patch(oldSubTree, nextSubTree)`

> replace 策略：same virtualNode 判定失败 → unmount old（按锚点范围）→ mount next 到 anchor 前。

## children diff（Vue 3 风格，而非纯双端）

### Phase A：无 key（索引对齐）

- 对齐公共长度：逐个 `patchChild(c1[i], c2[i])`
- 新数组更长：对剩余 new 逐个 mount（插入到 `anchor` 前）
- 旧数组更长：对剩余 old 逐个 unmount

### Phase B：有 key（增删移动）

采用 Vue 3 的「头尾同步 + key map」的混合策略：

1. 头部同步：从左到右，same virtualNode 就 patch 并 i++
2. 尾部同步：从右到左，same virtualNode 就 patch 并 e1--/e2--
3. 处理中间区间：
   - 建 `key → newIndex` map
   - 遍历旧中间区间：
     - key 不存在 → unmount
     - 存在 → patch，并记录 oldIndex 到 newIndex 的对应关系
   - 遍历新中间区间：旧中不存在的 → mount
   - 移动处理：
     - 最简单可行：从后往前按新顺序 `insertBefore` 到正确位置（保证顺序正确但可能多移动）
     - 性能优化（可选）：对 `newIndexToOldIndex` 求 LIS，跳过不需要移动的节点

> 结论：所谓「双端 diff」并没有「过时」，但在 Vue 3 里它更像是两个 fast path（头/尾同步），核心是中间区间的 key map +（可选）LIS。

## 实施里程碑

- M1：补齐 `setText` + Text patch（组件更新至少能不重建 Text）
- M2：升级 `patchProps(prev,next)`（含事件 invoker）+ Element patch
- M3：数组/Fragment 边界内 patch（start/end anchors 复用）
- M4：keyed diff（Phase B），补齐插入/删除/移动
- M5（可选）：root render 也走 patch（不再 `clear(container)`）

## 测试清单（先写最能抓住「重建」问题的）

- Text patch：更新文本不创建新 TextNode（引用不变）
- Element props：属性覆盖/移除、class/style 清空
- 事件更新：更新 handler 不叠加监听且旧 handler 不再触发
- children：
  - 无 key：追加/截断行为正确
  - 有 key：插入/删除/移动语义正确，且稳定 key 下节点复用
- 组件：更新时子组件实例不被重建（局部状态不丢）
