import { describe, expect, it } from 'vitest'
import { asRuntimeVNode, mountChild, patchChild } from '@/runtime-core/index.ts'
import type { RendererOptions } from '@/runtime-core/index.ts'
import { createTextVirtualNode } from '@/jsx-foundation/index.ts'

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

describe('patchChild runtime metadata reuse', () => {
  it('reuses host bindings and handles when updating text nodes', () => {
    const { options, container } = createHostOptions()
    const previous = createTextVirtualNode('before')
    const next = createTextVirtualNode('after')
    const mounted = mountChild(options, previous, container)

    expect(mounted?.nodes).toHaveLength(1)

    const runtimePrevious = asRuntimeVNode<TestNode, TestElement, TestFragment>(previous)

    patchChild(options, previous, next, container)

    const runtimeNext = asRuntimeVNode<TestNode, TestElement, TestFragment>(next)

    expect(runtimeNext.el).toBe(runtimePrevious.el)
    expect(runtimeNext.handle).toBe(runtimePrevious.handle)
    expect(runtimeNext.anchor).toBe(runtimePrevious.anchor)
    expect(runtimeNext.component).toBeUndefined()
    expect(runtimeNext.el?.text).toBe('after')
  })
})

function createHostOptions(): {
  options: RendererOptions<TestNode, TestElement, TestFragment>
  container: TestElement
} {
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
    removeFromParent(child)
    parent.children.push(child)
    child.parent = parent
  }

  const insertBefore = (
    parent: TestElement | TestFragment,
    child: TestNode,
    anchor?: TestNode,
  ): void => {
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

  return { options, container }
}
