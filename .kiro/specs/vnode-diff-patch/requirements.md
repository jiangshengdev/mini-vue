# Requirements Document

## Introduction

当前 mini-vue 的组件更新会全量卸载并重新挂载子树，导致 DOM 抖动与状态丢失（focus/scroll/输入法组合态），并且复杂树的性能开销显著。本功能引入最小可用的 VNode patch 能力，使「同一组件实例内的更新」能复用既有宿主节点并做增量更新。

## Glossary

- **Patch_System**: 负责 VNode 差量更新的核心模块，位于 runtime-core 层
- **Runtime_VNode**: 携带宿主节点引用的运行时 VNode 结构（el/anchor/component 等字段）
- **Host_Node**: 宿主平台的节点抽象（如 DOM 中的 Node）
- **Host_Element**: 宿主平台的元素抽象（如 DOM 中的 Element）
- **Renderer_Options**: 宿主平台提供的渲染原语接口
- **Keyed_Children**: 带有 key 属性的子节点列表
- **Unkeyed_Children**: 不带 key 属性的子节点列表
- **Invoker_Cache**: 事件监听器的缓存结构，用于避免重复绑定

## Requirements

### Requirement 1: 文本节点复用

**User Story:** As a mini-vue 开发者, I want 文本内容更新时复用既有 TextNode, so that 避免不必要的 DOM 重建并保持性能。

#### Acceptance Criteria

1. WHEN 同一位置的文本内容发生变化, THE Patch_System SHALL 复用既有 Host_Node 并仅更新其 nodeValue
2. WHEN 文本节点被 patch, THE Patch_System SHALL 保持该节点在 DOM 树中的引用不变

### Requirement 2: 元素节点复用

**User Story:** As a mini-vue 开发者, I want 同类型元素更新时复用既有 Element, so that 避免 DOM 重建导致的状态丢失。

#### Acceptance Criteria

1. WHEN 同一位置的 Element 类型（tagName）相同, THE Patch_System SHALL 复用既有 Host_Element 而非重建
2. WHEN Element 被复用, THE Patch_System SHALL 将新 VNode 的 el 引用指向旧节点

### Requirement 3: Props 差量更新

**User Story:** As a mini-vue 开发者, I want props 的差量能被正确应用, so that DOM 属性、class/style、事件监听符合最新 render 结果。

#### Acceptance Criteria

1. WHEN Element 的 props 从 prevProps 更新为 nextProps, THE Renderer_Options SHALL 添加或更新 nextProps 中的所有受支持字段
2. WHEN prevProps 中存在但 nextProps 中缺失的字段, THE Renderer_Options SHALL 移除对应宿主属性
3. WHEN prevProps 中存在但 nextProps 中值为 null 或 false 的字段, THE Renderer_Options SHALL 移除对应宿主属性
4. WHEN class 属性从有值变为空, THE Renderer_Options SHALL 清空元素的 className
5. WHEN style 属性从有值变为空, THE Renderer_Options SHALL 清空元素的 style

### Requirement 4: 事件监听更新

**User Story:** As a mini-vue 开发者, I want 事件监听能被正确更新而不叠加, so that 只触发最新的 handler。

#### Acceptance Criteria

1. WHEN 事件监听从旧 handler 更新为新 handler, THE Renderer_Options SHALL 确保只触发最新 handler
2. WHEN 事件监听被多次更新, THE Renderer_Options SHALL 不会累积多次触发
3. WHEN 事件监听被移除, THE Renderer_Options SHALL 调用 removeEventListener 解绑

### Requirement 5: 无 key 子节点增量更新

**User Story:** As a mini-vue 开发者, I want 无 key 列表也能增量更新, so that 常见场景获得基础性能提升。

#### Acceptance Criteria

1. WHEN Unkeyed_Children 数组发生变化, THE Patch_System SHALL 按索引对齐 patch 公共区间
2. WHEN 新 children 比旧 children 长, THE Patch_System SHALL mount 新增的尾部节点
3. WHEN 新 children 比旧 children 短, THE Patch_System SHALL unmount 多余的尾部节点

### Requirement 6: 有 key 子节点复用与移动

**User Story:** As a mini-vue 开发者, I want 带 key 的列表能复用并正确移动节点, so that 避免不必要的 DOM 重建并保证语义正确。

#### Acceptance Criteria

1. WHEN Keyed_Children 中节点只是重新排序, THE Patch_System SHALL 复用既有 Host_Node 并通过 insertBefore 移动到正确位置
2. WHEN Keyed_Children 中新增带 key 的节点, THE Patch_System SHALL 仅 mount 新增节点
3. WHEN Keyed_Children 中删除带 key 的节点, THE Patch_System SHALL 仅 unmount 被删除节点
4. WHEN 稳定 key 的节点被移动, THE Patch_System SHALL 保持节点引用不变

### Requirement 7: 组件子树 patch

**User Story:** As a mini-vue 开发者, I want 组件更新时子树走 patch 而非重建, so that 子组件实例和 DOM 状态得以保留。

#### Acceptance Criteria

1. WHEN 同一组件实例发生响应式更新, THE Patch_System SHALL 对 previousSubTree 与新 subTree 执行 patch
2. WHEN 组件子树被 patch, THE Patch_System SHALL 保持子组件实例不重建

### Requirement 8: 错误隔离

**User Story:** As a 框架维护者, I want patch 过程保持错误隔离语义, so that 更新失败不会导致整段 UI 消失。

#### Acceptance Criteria

1. WHEN 组件更新 render 过程抛错, THE Patch_System SHALL 保留上一轮已挂载子树
2. WHEN 组件更新 render 过程抛错, THE Patch_System SHALL 保持宿主节点不被破坏

### Requirement 9: 运行时 VNode 结构

**User Story:** As a 框架维护者, I want runtime-core 内部维护宿主引用, so that patch 能访问既有节点而不污染公共类型。

#### Acceptance Criteria

1. THE Runtime_VNode SHALL 包含 el 字段存储 Host_Node 或 Host_Element 引用
2. THE Runtime_VNode SHALL 包含 anchor 字段存储 Fragment/数组 children 的结束锚点
3. THE Runtime_VNode SHALL 包含 component 字段存储组件实例引用
4. THE Patch_System SHALL 不修改 jsx-foundation 的对外类型定义

### Requirement 10: 渲染原语扩展

**User Story:** As a 框架维护者, I want Renderer_Options 提供 setText 原语, so that 文本节点能被高效更新。

#### Acceptance Criteria

1. THE Renderer_Options SHALL 提供 setText(node, text) 方法
2. WHEN setText 被调用, THE Host_Node SHALL 更新其文本内容

## Non-Goals

- 不实现 Scheduler/nextTick（单独 spec）
- 不实现 Teleport/Suspense/异步组件
- 不要求 LIS 最少移动优化（可选优化项）
- 不实现 root render 走 patch（可选优化项）
