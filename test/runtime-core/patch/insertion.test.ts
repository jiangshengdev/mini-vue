import { describe, expect, it, vi } from 'vitest'
import type { RendererOptions } from '@/runtime-core/index.ts'
import {
  getHostNodesSafely,
  mountChild,
  normalizeRenderOutput,
  patchChild,
} from '@/runtime-core/index.ts'
import { createTextVirtualNode } from '@/jsx-foundation/index.ts'
import { __DEV__ } from '@/shared/index.ts'

interface TestNode {
  kind: 'element' | 'text' | 'fragment'
  children: TestNode[]
  parent?: TestNode
  text?: string
  tag?: string
}

interface TestElement extends TestNode {
  kind: 'element'
}

interface TestFragment extends TestNode {
  kind: 'fragment'
}

describe('patch 插入与诊断', () => {
  it('mountChild 在 anchor 处插入，不额外调用 append', () => {
    const host = createHostOptionsWithSpies()
    const anchor = host.options.createText('anchor')

    host.options.appendChild(host.container, anchor)
    host.resetCounts()

    mountChild(host.options, createTextVirtualNode('hello'), {
      container: host.container,
      anchor,
    })

    expect(host.counters.insertBefore).toBe(1)
    expect(host.counters.appendChild).toBe(0)
    expect(
      host.container.children.map((node) => {
        return node.text
      }),
    ).toEqual(['hello', 'anchor'])
  })

  it('patchChild 新节点使用 anchor 单次插入', () => {
    const host = createHostOptionsWithSpies()
    const anchor = host.options.createText('anchor')

    host.options.appendChild(host.container, anchor)
    host.resetCounts()

    const next = normalizeRenderOutput(createTextVirtualNode('patched'))!
    const result = patchChild(host.options, undefined, next, {
      container: host.container,
      anchor,
    })

    expect(host.counters.insertBefore).toBe(1)
    expect(host.counters.appendChild).toBe(0)
    expect(result?.ok).toBe(true)
    expect(result?.usedAnchor).toBe(anchor)
    expect(
      host.container.children.map((node) => {
        return node.text
      }),
    ).toEqual(['patched', 'anchor'])
  })

  it('getHostNodesSafely 在 DEV 模式下当运行时节点缺失时发出警告', () => {
    const virtualNode = normalizeRenderOutput(createTextVirtualNode('lonely'))!
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined
    })

    getHostNodesSafely<TestNode, TestElement, TestFragment>(virtualNode)

    if (__DEV__) {
      expect(warn).toHaveBeenCalledOnce()
    } else {
      expect(warn).not.toHaveBeenCalled()
    }

    warn.mockRestore()
  })
})

function createHostOptionsWithSpies(): {
  options: RendererOptions<TestNode, TestElement, TestFragment>
  container: TestElement
  counters: { appendChild: number; insertBefore: number }
  resetCounts(): void
} {
  const counters = { appendChild: 0, insertBefore: 0 }

  const removeFromParent = (node: TestNode): void => {
    if (!node.parent) {
      return
    }

    const siblings = node.parent.children
    const index = siblings.indexOf(node)

    if (index !== -1) {
      siblings.splice(index, 1)
    }

    node.parent = undefined
  }

  const appendChild = (parent: TestElement | TestFragment, child: TestNode): void => {
    counters.appendChild += 1
    removeFromParent(child)
    parent.children.push(child)
    child.parent = parent
  }

  const insertBefore = (
    parent: TestElement | TestFragment,
    child: TestNode,
    anchor?: TestNode,
  ): void => {
    counters.insertBefore += 1
    removeFromParent(child)

    if (!anchor) {
      appendChild(parent, child)

      return
    }

    const index = parent.children.indexOf(anchor)

    if (index === -1) {
      throw new Error('anchor not found in parent')
    }

    parent.children.splice(index, 0, child)
    child.parent = parent
  }

  const container: TestElement = { kind: 'element', children: [], tag: 'root' }

  const options: RendererOptions<TestNode, TestElement, TestFragment> = {
    createElement(type): TestElement {
      return { kind: 'element', children: [], tag: type }
    },
    createText(text): TestNode {
      return { kind: 'text', children: [], text }
    },
    createFragment(): TestFragment {
      return { kind: 'fragment', children: [] }
    },
    setText(node, text): void {
      node.text = text
    },
    appendChild,
    insertBefore,
    clear(target): void {
      target.children = []
    },
    remove(node): void {
      removeFromParent(node)
    },
    patchProps(): void {
      /* No-op for tests */
    },
  }

  return {
    options,
    container,
    counters,
    resetCounts(): void {
      counters.appendChild = 0
      counters.insertBefore = 0
    },
  }
}
