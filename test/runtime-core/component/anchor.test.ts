import { describe, expect, it, vi } from 'vitest'
import type { ComponentInstance } from '@/runtime-core/component/context.ts'
import { mountChildWithAnchor } from '@/runtime-core/component/anchor.ts'
import type { RendererOptions } from '@/runtime-core/index.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { effectScope } from '@/reactivity/index.ts'

interface TestNode {
  kind: 'element' | 'text' | 'fragment'
  children: TestNode[]
  parent?: TestNode
  text?: string
  tag?: string
}

type TestElement = TestNode & { kind: 'element' }

type TestFragment = TestNode & { kind: 'fragment' }

describe('mountChildWithAnchor', () => {
  it('逐个插入 fragment 子节点，不要求宿主 insertBefore 处理 fragment', () => {
    const { options, insertBefore } = createHostOptions()
    const container: TestElement = { kind: 'element', tag: 'root', children: [] }
    const component: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const instance: ComponentInstance<TestNode, TestElement, TestFragment, SetupComponent> = {
      provides: {},
      type: component,
      container,
      props: {},
      render() {
        return undefined
      },
      scope: effectScope(),
      shouldUseAnchor: true,
      cleanupTasks: [],
      setupContext: {},
    }

    const mounted = mountChildWithAnchor(options, instance, 'child')

    expect(mounted?.nodes).toHaveLength(1)
    expect(insertBefore).toHaveBeenCalledTimes(1)
    expect(
      insertBefore.mock.calls.some(([, child]) => {
        return child.kind === 'fragment'
      }),
    ).toBe(false)
    expect(container.children).toHaveLength(2)
    const [first, second] = container.children

    expect(first.text).toBe('child')
    expect(second).toBe(instance.anchor)
  })
})

function createHostOptions(): {
  options: RendererOptions<TestNode, TestElement, TestFragment>
  insertBefore: ReturnType<typeof vi.fn>
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

  const insertBefore = vi.fn(
    (parent: TestElement | TestFragment, child: TestNode, anchor?: TestNode): void => {
      if (child.kind === 'fragment') {
        throw new Error('fragment insertion is not supported')
      }

      removeFromParent(child)

      if (!anchor) {
        parent.children.push(child)
        child.parent = parent

        return
      }

      const index = parent.children.indexOf(anchor)

      if (index === -1) {
        throw new Error('anchor not found in parent')
      }

      parent.children.splice(index, 0, child)
      child.parent = parent
    },
  )

  const options: RendererOptions<TestNode, TestElement, TestFragment> = {
    createElement(type): TestElement {
      return { kind: 'element', tag: type, children: [] }
    },
    createText(text): TestNode {
      return { kind: 'text', text, children: [] }
    },
    createFragment(): TestFragment {
      return { kind: 'fragment', children: [] }
    },
    appendChild(parent, child): void {
      removeFromParent(child)
      parent.children.push(child)
      child.parent = parent
    },
    insertBefore,
    clear(container): void {
      container.children = []
    },
    remove(node): void {
      removeFromParent(node)
    },
    patchProps(): void {
      /* No-op for tests */
    },
  }

  return { options, insertBefore }
}
