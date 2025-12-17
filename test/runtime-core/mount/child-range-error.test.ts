import { describe, expect, it } from 'vitest'
import type { RendererOptions } from '@/runtime-core/index.ts'
import { mountChild } from '@/runtime-core/index.ts'

interface MockNode {
  text?: string
}

type MockContainer = MockNode & { children: MockNode[] }

// 超过常见的函数参数数量限制（约 65k）
const massiveChildCount = 70_000

function createMockRendererOptions(): RendererOptions<MockNode, MockContainer, MockContainer> {
  return {
    createElement() {
      return { children: [] }
    },
    createText(text) {
      return { text }
    },
    createFragment() {
      return { children: [] }
    },
    setText(node, text) {
      node.text = text
    },
    appendChild(parent, child) {
      parent.children.push(child)
    },
    insertBefore(parent, child, anchor) {
      if (!anchor) {
        parent.children.push(child)

        return
      }

      const index = parent.children.indexOf(anchor)

      if (index === -1) {
        throw new Error('anchor not found')
      }

      parent.children.splice(index, 0, child)
    },
    clear(container) {
      container.children.length = 0
    },
    remove() {
      /* No-op for mock host */
    },
    patchProps() {
      /* No-op for mock host */
    },
  }
}

describe('runtime-core mountChild large arrays', () => {
  it('避免在超大子节点列表上触发 push 展开 RangeError', () => {
    const options = createMockRendererOptions()
    const container: MockContainer = { children: [] }
    const massive = Array.from({ length: massiveChildCount }, (_, index) => {
      return index
    })

    const mounted = mountChild(options, [massive as unknown as number, 'tail'], container)

    expect(mounted?.ok).toBe(true)
    expect(mounted?.nodes.length).toBeGreaterThan(massive.length)
    expect(container.children.length).toBe(mounted?.nodes.length ?? 0)
  })
})
