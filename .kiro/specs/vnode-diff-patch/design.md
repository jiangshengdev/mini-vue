# VNode Diff / Patch — Design

## Overview

本设计为 mini-vue 引入 VNode diff/patch 能力。核心目标是让组件更新时能复用既有宿主节点进行增量更新，而非全量卸载重建。

当前问题：

- `render-effect.ts` 在 rerender 时执行 `teardownMountedSubtree` 再重新挂载，导致 DOM/子组件实例重建
- `renderer.ts` 每次 render 先 clear 容器，无 root patch
- `patch-props.ts` 只"写入 next"，无法可靠移除旧 props/解绑事件

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      runtime-core                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  renderer   │  │   mount/*   │  │      patch/*        │ │
│  │             │  │             │  │  ┌───────────────┐  │ │
│  │  render()   │──│ mountChild  │  │  │  patchChild   │  │ │
│  │  unmount()  │  │ mountElem   │  │  │  patchChildren│  │ │
│  └─────────────┘  └─────────────┘  │  │  patchKeyed   │  │ │
│         │                          │  └───────────────┘  │ │
│         ▼                          └─────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              RendererOptions (interface)            │   │
│  │  createElement | createText | appendChild | remove  │   │
│  │  insertBefore | clear | patchProps | setText        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      runtime-dom                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              domRendererOptions                      │   │
│  │  createElement: document.createElement              │   │
│  │  createText: document.createTextNode                │   │
│  │  setText: node.nodeValue = text                     │   │
│  │  patchProps: 属性/class/style/事件 差量更新          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

关键原则：

1. runtime-core 负责 diff/patch 与节点移动；宿主负责最小原语
2. JSX 的 `VirtualNode` 类型保持"平台无关、无宿主引用"；宿主引用由 runtime-core 内部维护
3. 更新失败不破坏上一轮 DOM：遵循"先生成新子树，成功后再 patch"的顺序

## Components and Interfaces

### RendererOptions 扩展

```typescript
interface RendererOptions<HostNode, HostElement, HostFragment> {
  // 现有方法...
  createElement(type: string): HostElement
  createText(text: string): HostNode
  appendChild(parent: HostElement | HostFragment, child: HostNode): void
  insertBefore(parent: HostElement | HostFragment, child: HostNode, anchor?: HostNode): void
  remove(node: HostNode): void
  clear(container: HostElement): void

  // 新增方法
  setText(node: HostNode, text: string): void
  patchProps(element: HostElement, prevProps?: PropsShape, nextProps?: PropsShape): void
}
```

### RuntimeVNode 结构

runtime-core 内部结构，不暴露到 jsx-foundation：

```typescript
interface RuntimeVNode {
  // 原始 VNode 字段
  type: string | Component
  props?: PropsShape
  children?: RenderOutput
  key?: string | number

  // 运行时字段
  el?: HostNode | HostElement // Text/Element 的宿主节点引用
  anchor?: HostNode // Fragment/数组的结束锚点
  component?: ComponentInstance // 组件实例引用
}
```

### Patch 入口

```typescript
// src/runtime-core/patch/index.ts
function patchChild(
  options: RendererOptions,
  oldChild: RuntimeVNode | string | number | null,
  newChild: RuntimeVNode | string | number | null,
  container: HostElement,
  anchor?: HostNode,
): void
```

分派逻辑：

- **same 判定**: VNode 以 `type + key` 判断；Text 以"都是原始值"判断
- **Text↔Text**: 调用 `setText(old.el, String(new))`
- **Element↔Element**: `patchProps(el, old.props, new.props)` + `patchChildren`
- **类型切换**: unmount old + mount new 到 anchor 前

### Children Diff 算法

#### Phase A: 无 key（索引对齐）

```typescript
function patchUnkeyedChildren(
  oldChildren: RuntimeVNode[],
  newChildren: RuntimeVNode[],
  container: HostElement,
  anchor?: HostNode,
): void {
  const commonLength = Math.min(oldChildren.length, newChildren.length)

  // 1. patch 公共区间
  for (let i = 0; i < commonLength; i++) {
    patchChild(options, oldChildren[i], newChildren[i], container)
  }

  // 2. mount 新增尾部
  for (let i = commonLength; i < newChildren.length; i++) {
    mountChild(options, newChildren[i], container, anchor)
  }

  // 3. unmount 旧的尾部
  for (let i = commonLength; i < oldChildren.length; i++) {
    unmount(oldChildren[i])
  }
}
```

#### Phase B: 有 key（头尾同步 + key map）

```typescript
function patchKeyedChildren(
  oldChildren: RuntimeVNode[],
  newChildren: RuntimeVNode[],
  container: HostElement,
  anchor?: HostNode,
): void {
  let oldStart = 0,
    oldEnd = oldChildren.length - 1
  let newStart = 0,
    newEnd = newChildren.length - 1

  // 1. 头部同步（从左到右）
  while (oldStart <= oldEnd && newStart <= newEnd) {
    if (isSameVNode(oldChildren[oldStart], newChildren[newStart])) {
      patchChild(options, oldChildren[oldStart], newChildren[newStart], container)
      oldStart++
      newStart++
    } else break
  }

  // 2. 尾部同步（从右到左）
  while (oldStart <= oldEnd && newStart <= newEnd) {
    if (isSameVNode(oldChildren[oldEnd], newChildren[newEnd])) {
      patchChild(options, oldChildren[oldEnd], newChildren[newEnd], container)
      oldEnd--
      newEnd--
    } else break
  }

  // 3. 中间区间处理
  // - 建立 key → newIndex map
  // - 遍历 old 做匹配 patch / unmount
  // - 遍历 new mount 不存在的
  // - 从后往前 insertBefore 保证顺序
}
```

## Data Models

### VNode 到 HostNode 的映射

使用 WeakMap 维护 VNode 到宿主节点的关联：

```typescript
// src/runtime-core/patch/vnode-map.ts
const vnodeToEl = new WeakMap<object, HostNode>()

function setVNodeEl(vnode: RuntimeVNode, el: HostNode): void {
  vnodeToEl.set(vnode, el)
}

function getVNodeEl(vnode: RuntimeVNode): HostNode | undefined {
  return vnodeToEl.get(vnode)
}
```

### 事件 Invoker 缓存

```typescript
// src/runtime-dom/patch-props.ts
interface Invoker extends EventListener {
  value: EventListener
}

// 在 element 上缓存 invokers
const invokerCache = new WeakMap<Element, Map<string, Invoker>>()
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

基于 prework 分析，以下是需要验证的正确性属性：

### Property 1: 文本更新保持节点引用

_For any_ 文本内容变化，patch 后 TextNode 引用应保持不变，且内容等于新文本
**Validates: Requirements 1.2, 6.1**

### Property 2: 类型切换正确替换

_For any_ VNode 类型切换（如 div→span），旧节点应被移除，新节点应被插入到相同位置
**Validates: Requirements 1.3**

### Property 3: Props 差量正确应用

_For any_ prevProps 和 nextProps 对，patch 后 DOM 元素应只包含 nextProps 中的属性
**Validates: Requirements 2.1, 2.2**

### Property 4: 事件更新不叠加

_For any_ 事件 handler 更新序列，触发事件时应只调用最新 handler 且调用次数为 1
**Validates: Requirements 2.3**

### Property 5: 无 key children 索引对齐复用

_For any_ 无 key children 变化，公共索引区间的节点引用应保持不变
**Validates: Requirements 3.1**

### Property 6: Keyed children 顺序与复用

_For any_ keyed children 重排，最终 DOM 顺序应与新 children 顺序一致，且稳定 key 的节点引用集合不变
**Validates: Requirements 4.1, 4.4**

### Property 7: 错误隔离保持 DOM 状态

_For any_ render 抛错场景，DOM 状态应与抛错前一致
**Validates: Requirements 5.1**

## Error Handling

1. **render 抛错**: 恢复 `instance.subTree = previousSubTree` 并退出，不触碰已挂载 DOM
2. **patch 中途失败**: 由于 patch 是原子操作序列，失败时已执行的 DOM 操作无法回滚，但组件状态会恢复到 previousSubTree
3. **类型断言失败**: 开发模式下打印警告，生产模式静默跳过

## Testing Strategy

### 单元测试

- 使用 vitest 作为测试框架
- 测试文件位于 `test/runtime-core/` 和 `test/runtime-dom/`
- 重点验证"未重建"断言：节点引用不变、事件不叠加、key 移动只移动不重建

### Property-Based Testing

- 使用 fast-check 库进行属性测试
- 每个 property test 运行至少 100 次迭代
- 测试标注格式: `**Feature: vnode-diff-patch, Property {number}: {property_text}**`

测试示例：

```typescript
import fc from 'fast-check'

// **Feature: vnode-diff-patch, Property 6: Keyed children 顺序与复用**
test('keyed children reorder preserves node references', () => {
  fc.assert(
    fc.property(fc.array(fc.string(), { minLength: 1, maxLength: 10 }), (keys) => {
      // 生成初始 children
      const oldChildren = keys.map((k) => ({ type: 'div', key: k }))
      // 随机打乱顺序
      const newChildren = shuffle([...oldChildren])

      // mount → patch → 验证
      const oldEls = mount(oldChildren)
      patch(oldChildren, newChildren)
      const newEls = getEls(newChildren)

      // 验证：节点引用集合不变
      expect(new Set(newEls)).toEqual(new Set(oldEls))
      // 验证：DOM 顺序与 newChildren 一致
      expect(getDomOrder()).toEqual(newChildren.map((c) => c.key))
    }),
    { numRuns: 100 },
  )
})
```
