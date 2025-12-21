/**
 * Keyed diff 正向单元测试（调试用）
 * 使用 5-10 个元素的简单场景，方便调试 diff 算法
 *
 * Feature: virtualNode-diff-patch, Property 6: Keyed diff 保序与复用
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */
import { describe, expect, it } from 'vitest'
import { createHostRenderer, normalize } from './test-utils.ts'
import type { HostRenderer } from './test-utils.ts'
import {
  asRuntimeVirtualNode,
  mountChild,
  patchChild,
  patchChildren,
} from '@/runtime-core/index.ts'
import type { NormalizedVirtualNode } from '@/runtime-core/index.ts'

/**
 * 辅助函数：挂载 children 列表并返回运行时节点
 */
function mountChildren(host: HostRenderer, children: NormalizedVirtualNode[]) {
  for (const [index, child] of children.entries()) {
    mountChild(host.options, child, {
      container: host.container,
      context: { shouldUseAnchor: index < children.length - 1 },
    })
  }

  return children.map((child) => {
    return asRuntimeVirtualNode(child)
  })
}

/**
 * 辅助函数：获取容器中元素的文本内容顺序
 */
function getTextOrder(host: HostRenderer): string[] {
  return host.container.children
    .filter((node) => {
      return node.kind === 'element'
    })
    .map((node) => {
      const textChild = node.children.find((child) => {
        return child.kind === 'text'
      })

      return textChild?.text ?? ''
    })
}

/**
 * 辅助函数：创建带 key 的 div 元素列表
 */
function createKeyedDivs(keys: string[]): NormalizedVirtualNode[] {
  return keys.map((key) => {
    return normalize(<div key={key}>{key}</div>)
  })
}

describe('keyed diff 正向测试（5-10 元素，调试用）', () => {
  // 用例 1：头部插入单个元素
  // [B,C,D,E,F] → [A,B,C,D,E,F]
  it('头部插入单个元素', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    // 验证 DOM 顺序正确
    expect(getTextOrder(host)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    // 验证节点复用：B、C、D、E、F 应复用
    expect(nextRuntime[1].el).toBe(previousRuntime[0].el)
    expect(nextRuntime[2].el).toBe(previousRuntime[1].el)
    expect(nextRuntime[3].el).toBe(previousRuntime[2].el)
    expect(nextRuntime[4].el).toBe(previousRuntime[3].el)
    expect(nextRuntime[5].el).toBe(previousRuntime[4].el)
    // 验证没有删除节点
    expect(host.counters.remove).toBe(0)
  })

  // 用例 2：尾部插入单个元素
  // [A,B,C,D,E] → [A,B,C,D,E,F]
  it('尾部插入单个元素', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getTextOrder(host)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])

    // 验证所有旧节点复用
    for (let i = 0; i < 5; i++) {
      expect(nextRuntime[i].el).toBe(previousRuntime[i].el)
    }

    expect(host.counters.remove).toBe(0)
  })

  // 用例 3：中间插入单个元素
  // [A,B,D,E,F] → [A,B,C,D,E,F]
  it('中间插入单个元素', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'D', 'E', 'F'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getTextOrder(host)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    // A、B 复用
    expect(nextRuntime[0].el).toBe(previousRuntime[0].el)
    expect(nextRuntime[1].el).toBe(previousRuntime[1].el)
    // D、E、F 复用
    expect(nextRuntime[3].el).toBe(previousRuntime[2].el)
    expect(nextRuntime[4].el).toBe(previousRuntime[3].el)
    expect(nextRuntime[5].el).toBe(previousRuntime[4].el)
    expect(host.counters.remove).toBe(0)
  })

  // 用例 4：头部删除单个元素
  // [A,B,C,D,E,F] → [B,C,D,E,F]
  it('头部删除单个元素', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['B', 'C', 'D', 'E', 'F'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getTextOrder(host)).toEqual(['B', 'C', 'D', 'E', 'F'])

    // B、C、D、E、F 复用
    for (let i = 0; i < 5; i++) {
      expect(nextRuntime[i].el).toBe(previousRuntime[i + 1].el)
    }

    expect(host.counters.remove).toBe(1)
  })

  // 用例 5：尾部删除单个元素
  // [A,B,C,D,E,F] → [A,B,C,D,E]
  it('尾部删除单个元素', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getTextOrder(host)).toEqual(['A', 'B', 'C', 'D', 'E'])

    // A、B、C、D、E 复用
    for (let i = 0; i < 5; i++) {
      expect(nextRuntime[i].el).toBe(previousRuntime[i].el)
    }

    expect(host.counters.remove).toBe(1)
  })

  // 用例 6：中间删除单个元素
  // [A,B,C,D,E,F] → [A,B,D,E,F]
  it('中间删除单个元素', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['A', 'B', 'D', 'E', 'F'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getTextOrder(host)).toEqual(['A', 'B', 'D', 'E', 'F'])
    // A、B 复用
    expect(nextRuntime[0].el).toBe(previousRuntime[0].el)
    expect(nextRuntime[1].el).toBe(previousRuntime[1].el)
    // D、E、F 复用
    expect(nextRuntime[2].el).toBe(previousRuntime[3].el)
    expect(nextRuntime[3].el).toBe(previousRuntime[4].el)
    expect(nextRuntime[4].el).toBe(previousRuntime[5].el)
    expect(host.counters.remove).toBe(1)
  })

  // 用例 7：相邻元素交换
  // [A,B,C,D,E,F] → [A,B,D,C,E,F]
  it('相邻元素交换', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['A', 'B', 'D', 'C', 'E', 'F'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getTextOrder(host)).toEqual(['A', 'B', 'D', 'C', 'E', 'F'])
    // 所有节点都应复用
    expect(nextRuntime[0].el).toBe(previousRuntime[0].el)
    expect(nextRuntime[1].el).toBe(previousRuntime[1].el)
    expect(nextRuntime[2].el).toBe(previousRuntime[3].el) // D
    expect(nextRuntime[3].el).toBe(previousRuntime[2].el) // C
    expect(nextRuntime[4].el).toBe(previousRuntime[4].el)
    expect(nextRuntime[5].el).toBe(previousRuntime[5].el)
    expect(host.counters.remove).toBe(0)
  })

  // 用例 8：首尾元素交换
  // [A,B,C,D,E,F] → [F,B,C,D,E,A]
  it('首尾元素交换', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['F', 'B', 'C', 'D', 'E', 'A'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getTextOrder(host)).toEqual(['F', 'B', 'C', 'D', 'E', 'A'])
    // 所有节点都应复用
    expect(nextRuntime[0].el).toBe(previousRuntime[5].el) // F
    expect(nextRuntime[1].el).toBe(previousRuntime[1].el) // B
    expect(nextRuntime[2].el).toBe(previousRuntime[2].el) // C
    expect(nextRuntime[3].el).toBe(previousRuntime[3].el) // D
    expect(nextRuntime[4].el).toBe(previousRuntime[4].el) // E
    expect(nextRuntime[5].el).toBe(previousRuntime[0].el) // A
    expect(host.counters.remove).toBe(0)
  })

  // 用例 9：完全逆序
  // [A,B,C,D,E,F] → [F,E,D,C,B,A]
  it('完全逆序', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountChildren(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['F', 'E', 'D', 'C', 'B', 'A'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getTextOrder(host)).toEqual(['F', 'E', 'D', 'C', 'B', 'A'])
    // 所有节点都应复用（逆序）
    expect(nextRuntime[0].el).toBe(previousRuntime[5].el) // F
    expect(nextRuntime[1].el).toBe(previousRuntime[4].el) // E
    expect(nextRuntime[2].el).toBe(previousRuntime[3].el) // D
    expect(nextRuntime[3].el).toBe(previousRuntime[2].el) // C
    expect(nextRuntime[4].el).toBe(previousRuntime[1].el) // B
    expect(nextRuntime[5].el).toBe(previousRuntime[0].el) // A
    expect(host.counters.remove).toBe(0)
  })
})
