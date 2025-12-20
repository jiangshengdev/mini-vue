# Design Document

## Overview

本设计为 mini-vue 引入 VNode patch 能力，使组件更新能复用既有宿主节点并做增量更新，而非全量卸载重建。核心思路是：runtime-core 负责 diff/patch 与节点移动，宿主平台负责最小原语（create/insert/remove/patchProps/setText）。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      runtime-core                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ patchChild  │──│patchChildren│──│ keyed-children.ts   │  │
│  │  (入口)     │  │ (children)  │  │ (头尾同步+key map)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         ▼                ▼                    ▼              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              RuntimeVNode (el/anchor/component)      │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                                                    │
└─────────│────────────────────────────────────────────────────┘
          │ RendererOptions
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      runtime-dom                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  setText    │  │ patchProps  │  │  invoker cache      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### RendererOptions 扩展

```typescript
interface RendererOptions<HostNode, HostElement> {
  // 现有方法...

  // 新增：文本节点更新
  setText(node: HostNode, text: string): void

  // 升级签名：支持 prev/next 差量
  patchProps(
    element: HostElement,
    prevProps: Record<string, unknown> | undefined,
    nextProps: Record<string, unknown> | undefined,
  ): void
}
```

### RuntimeVNode 结构

```typescript
// runtime-core 内部结构，不暴露到 jsx-foundation
interface RuntimeVNode {
  // 原始 VNode 字段...

  // 运行时字段
  el?: HostNode | HostElement // Text/Element 的宿主节点引用
  anchor?: HostNode // Fragment/数组 children 的结束锚点
  component?: ComponentInstance // 组件实例引用
}
```

### patchChild 入口

```typescript
function patchChild(
  oldVNode: RuntimeVNode,
  newVNode: RuntimeVNode,
  container: HostElement,
  anchor?: HostNode,
): void {
  // same 判定：type + key
  if (isSameVNodeType(oldVNode, newVNode)) {
    // 分派到具体 patch 逻辑
    if (isText(oldVNode)) {
      patchText(oldVNode, newVNode)
    } else if (isElement(oldVNode)) {
      patchElement(oldVNode, newVNode)
    } else if (isComponent(oldVNode)) {
      patchComponent(oldVNode, newVNode)
    }
  } else {
    // 类型不同：replace
    unmount(oldVNode)
    mount(newVNode, container, anchor)
  }
}
```

### patchChildren 算法

```typescript
function patchChildren(
  oldChildren: RuntimeVNode[],
  newChildren: RuntimeVNode[],
  container: HostElement,
  anchor?: HostNode,
): void {
  if (hasKey(newChildren)) {
    patchKeyedChildren(oldChildren, newChildren, container, anchor)
  } else {
    patchUnkeyedChildren(oldChildren, newChildren, container, anchor)
  }
}
```

## Data Models

### Invoker Cache（事件缓存）

```typescript
// 存储在 element 上的事件 invoker 缓存
interface EventInvoker {
  value: EventListener
  attached: number // 绑定时间戳
}

// element._vei = { onClick: invoker, onInput: invoker, ... }
type EventInvokerCache = Record<string, EventInvoker | undefined>
```

### Children Diff 中间状态

```typescript
// keyed diff 的 key → index 映射
type KeyToIndexMap = Map<string | number, number>

// newIndex → oldIndex 映射（用于 LIS 优化）
type NewIndexToOldIndexMap = number[]
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: 文本节点复用

_For any_ 文本节点和任意新文本内容，当执行 patch 时，宿主节点引用应保持不变，且 nodeValue 应等于新文本内容。

**Validates: Requirements 1.1, 1.2**

### Property 2: 元素节点复用

_For any_ 同类型（tagName 相同）的元素节点，当执行 patch 时，宿主元素引用应保持不变。

**Validates: Requirements 2.1, 2.2**

### Property 3: Props 差量更新

_For any_ prevProps 和 nextProps 组合，patch 后元素应满足：

- nextProps 中的所有字段都被正确应用
- prevProps 中存在但 nextProps 中缺失（或为 null/false）的字段被移除

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 4: 事件监听不叠加

_For any_ 事件监听更新序列，触发事件时应只调用最新的 handler，且调用次数为 1。

**Validates: Requirements 4.1, 4.2**

### Property 5: 无 key 子节点索引对齐

_For any_ 无 key 的 children 数组变化，patch 后应满足：

- 公共区间内的节点引用保持不变
- 最终 DOM 顺序与新 children 顺序一致
- 新增节点被正确 mount，多余节点被正确 unmount

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 6: Keyed diff 保序与复用

_For any_ 带 key 的 children 列表变换（包括重排、插入、删除），patch 后应满足：

- 最终 DOM 顺序与新 children 顺序一致
- 稳定 key 的节点引用集合不变
- 仅新增的 key 对应新 mount 的节点
- 仅删除的 key 对应被 unmount 的节点

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 7: 组件子树 patch 复用

_For any_ 组件响应式更新，patch 后应满足：

- 子组件实例引用保持不变
- 子树中可复用的节点引用保持不变

**Validates: Requirements 7.1, 7.2**

## Error Handling

### 组件更新错误隔离

- 保持现有 rerender 的「先 run renderSchedulerJob 成功，再进行替换/patch」的顺序
- render 抛错时：恢复 `instance.subTree = previousSubTree` 并退出，不触碰已挂载 DOM
- 错误通过现有的 error channel 上报，不影响兄弟组件

### patch 过程错误

- 单个节点 patch 失败不应影响兄弟节点
- 保持 DOM 树的一致性状态

## Testing Strategy

### 测试框架

- 使用 Vitest 作为测试框架
- 使用 fast-check 进行 Property-Based Testing（可选）
- 测试文件位于 `test/runtime-core/patch/` 和 `test/runtime-dom/`

### 单元测试

单元测试用于验证特定示例和边界情况：

- setText 功能验证
- patchProps 边界情况（class/style 清空、null/false 移除）
- 事件监听移除（removeEventListener 调用验证）
- 错误隔离场景
- RuntimeVNode 结构验证

### Property-Based Tests

Property-Based Tests 用于验证通用属性，每个属性测试至少运行 100 次迭代：

- **Property 1**: 文本节点复用 - 生成随机文本内容，验证节点引用不变
- **Property 2**: 元素节点复用 - 生成随机 props 变化，验证元素引用不变
- **Property 3**: Props 差量更新 - 生成随机 prevProps/nextProps，验证差量正确应用
- **Property 4**: 事件监听不叠加 - 生成随机事件更新序列，验证只触发最新 handler
- **Property 5**: 无 key 子节点索引对齐 - 生成随机列表变化，验证索引对齐和节点复用
- **Property 6**: Keyed diff 保序与复用 - 生成随机 key 列表变换，验证顺序和复用
- **Property 7**: 组件子树 patch 复用 - 生成随机组件更新，验证实例和节点复用

### 测试标注格式

每个 property test 必须包含注释标注：

```typescript
// Feature: vnode-diff-patch, Property 6: Keyed diff 保序与复用
// Validates: Requirements 6.1, 6.2, 6.3, 6.4
```
