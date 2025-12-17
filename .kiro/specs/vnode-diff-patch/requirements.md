# VNode Diff / Patch — Requirements

## 背景

当前组件更新会全量卸载并重新挂载子树，导致 DOM 抖动与状态丢失（focus/scroll/输入法组合态），并且复杂树的性能开销显著。

本 spec 目标是引入最小可用的 VNode patch 能力，使“同一组件实例内的更新”能复用既有宿主节点并做增量更新；同时为后续 scheduler / nextTick 等能力留出接口，但不在本 spec 内实现这些能力。

## 用户故事（User Stories）

### US-1：组件更新不应重建 DOM

作为使用 mini-vue 的开发者，
我希望组件状态更新时能复用已有 DOM 节点，
以避免 focus/scroll 等状态丢失并提升性能。

**验收标准（EARS）**

- WHEN 同一组件实例发生响应式更新且新旧子树可复用
  THE SYSTEM SHALL 通过 patch 更新宿主树而不是卸载后重建。
- WHEN 更新只改变文本内容
  THE SYSTEM SHALL 复用既有 TextNode 并仅更新其文本。

### US-2：元素 props 能被可靠更新与移除

作为使用 mini-vue 的开发者，
我希望在更新时 props 的差量能被正确应用，
以保证 DOM 属性、class/style、以及事件监听符合最新 render 结果。

**验收标准（EARS）**

- WHEN Element 的 props 从 prevProps 更新为 nextProps
  THE SYSTEM SHALL 添加或更新 nextProps 中的所有受支持字段。
- WHEN prevProps 中存在但 nextProps 中缺失（或为 null/false）的字段
  THE SYSTEM SHALL 移除对应宿主属性/效果（包含 class/style 清空）。
- WHEN 事件监听从旧 handler 更新为新 handler
  THE SYSTEM SHALL 确保只触发最新 handler 且不会叠加重复监听。

### US-3：children 支持无 key 的增量更新

作为使用 mini-vue 的开发者，
我希望在列表无 key 的情况下也能避免全量重建，
以在常见场景获得基础性能提升。

**验收标准（EARS）**

- WHEN children 数组发生变化且不涉及 key 复用
  THE SYSTEM SHALL 按索引对齐 patch 公共区间，并正确处理新增与删除。

### US-4：children 支持 key 的增删移动

作为使用 mini-vue 的开发者，
我希望在提供 key 时列表能复用并正确移动节点，
以避免不必要的 DOM 重建并保证语义正确。

**验收标准（EARS）**

- WHEN 同层 children 提供稳定 key 且节点只是重新排序
  THE SYSTEM SHALL 复用既有宿主节点并通过插入移动保证最终顺序正确。
- WHEN 新列表新增/删除带 key 的节点
  THE SYSTEM SHALL 仅 mount 新增节点并 unmount 被删除节点。

### US-5：组件子树 patch 不应破坏错误隔离语义

作为框架维护者，
我希望在引入 patch 后仍保持既有的错误隔离语义，
以避免更新失败导致整段 UI 消失。

**验收标准（EARS）**

- WHEN 组件更新 render 过程抛错
  THE SYSTEM SHALL 保留上一轮已挂载子树与宿主节点不被破坏。

## 非目标（Non-goals）

- 不实现 Scheduler/nextTick（单独 spec）。
- 不实现 Teleport/Suspense/异步组件。
- 不要求 LIS 最少移动优化（可选优化项）。
