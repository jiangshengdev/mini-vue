# Requirements Document

## Introduction

本功能为 mini-vue 引入 VNode diff/patch 能力，使组件更新时能复用既有宿主节点进行增量更新，而非全量卸载重建。这将解决当前实现中 DOM 抖动、状态丢失（focus/scroll/输入法组合态）以及复杂树性能开销等问题。

## Glossary

- **VNode**: Virtual Node，JSX 编译产物，描述 UI 结构的轻量对象
- **Patch_System**: 负责对比新旧 VNode 并将差异应用到宿主节点的核心模块
- **HostNode**: 宿主环境的节点类型（DOM 环境下为 Node）
- **HostElement**: 宿主环境的元素类型（DOM 环境下为 Element）
- **RuntimeVNode**: runtime-core 内部扩展的 VNode 结构，携带宿主节点引用（el/anchor/component）
- **Anchor**: 用于标记插入位置的占位节点
- **Keyed_Children**: 带有 key 属性的子节点列表，用于精确匹配复用
- **Invoker**: 事件处理器的包装对象，用于缓存和更新事件监听
- **DOM_Host**: runtime-dom 提供的宿主环境实现

## Requirements

### Requirement 1

**User Story:** 作为 mini-vue 开发者，我希望组件状态更新时能复用已有 DOM 节点，以避免 focus/scroll 等状态丢失并提升性能。

#### Acceptance Criteria

1. WHEN 同一组件实例发生响应式更新且新旧子树可复用，THE Patch_System SHALL 通过 patch 更新宿主树而不是卸载后重建。
2. WHEN 更新只改变文本内容，THE Patch_System SHALL 复用既有 TextNode 并仅更新其文本值。
3. WHEN 新旧 VNode 类型不同，THE Patch_System SHALL 卸载旧节点并在相同位置挂载新节点。

### Requirement 2

**User Story:** 作为 mini-vue 开发者，我希望在更新时 props 的差量能被正确应用，以保证 DOM 属性、class/style、以及事件监听符合最新 render 结果。

#### Acceptance Criteria

1. WHEN Element 的 props 从 prevProps 更新为 nextProps，THE Patch_System SHALL 添加或更新 nextProps 中的所有受支持字段。
2. WHEN prevProps 中存在但 nextProps 中缺失（或为 null/false）的字段，THE Patch_System SHALL 移除对应宿主属性或效果（包含 class/style 清空）。
3. WHEN 事件监听从旧 handler 更新为新 handler，THE Patch_System SHALL 确保只触发最新 handler 且不会叠加重复监听。
4. WHEN mount 阶段调用 patchProps，THE Patch_System SHALL 以 prevProps 为 undefined 应用 nextProps。

### Requirement 3

**User Story:** 作为 mini-vue 开发者，我希望在列表无 key 的情况下也能避免全量重建，以在常见场景获得基础性能提升。

#### Acceptance Criteria

1. WHEN children 数组发生变化且不涉及 key 复用，THE Patch_System SHALL 按索引对齐 patch 公共区间，并正确处理新增与删除。
2. WHEN 新 children 追加到末尾，THE Patch_System SHALL 仅挂载新增 children 而不影响已有节点。
3. WHEN children 从末尾截断，THE Patch_System SHALL 仅卸载被移除的 children。

### Requirement 4

**User Story:** 作为 mini-vue 开发者，我希望在提供 key 时列表能复用并正确移动节点，以避免不必要的 DOM 重建并保证语义正确。

#### Acceptance Criteria

1. WHEN 同层 children 提供稳定 key 且节点只是重新排序，THE Patch_System SHALL 复用既有宿主节点并通过插入移动保证最终顺序正确。
2. WHEN 新列表新增带 key 的节点，THE Patch_System SHALL 仅 mount 新增节点。
3. WHEN 新列表删除带 key 的节点，THE Patch_System SHALL 仅 unmount 被删除节点。
4. WHEN 带 key 的 children 被移动，THE Patch_System SHALL 保持节点引用不变。

### Requirement 5

**User Story:** 作为框架维护者，我希望在引入 patch 后仍保持既有的错误隔离语义，以避免更新失败导致整段 UI 消失。

#### Acceptance Criteria

1. WHEN 组件更新 render 过程抛错，THE Patch_System SHALL 保留上一轮已挂载子树与宿主节点不被破坏。
2. WHEN patch 操作中途失败，THE Patch_System SHALL 恢复到之前状态，不留下不一致的 DOM。

### Requirement 6

**User Story:** 作为 mini-vue 开发者，我希望渲染器提供 setText 原语，以便高效更新文本节点。

#### Acceptance Criteria

1. WHEN 对文本节点调用 setText，THE RendererOptions SHALL 更新节点文本内容而不创建新节点。
2. WHEN runtime-dom 实现收到 setText 调用，THE DOM_Host SHALL 设置 node.nodeValue 为新文本。
