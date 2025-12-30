import { describe, expect, it } from 'vitest'
import type { TestElement, TestNode } from '../host-utils.ts'
import { createHostRenderer, normalize } from '../host-utils.ts'
import type { NormalizedVirtualNode } from '@/runtime-core/index.ts'
import { asRuntimeVirtualNode, mountChild, patchChild } from '@/runtime-core/index.ts'
import type { SetupComponent } from '@/index.ts'
import { nextTick } from '@/index.ts'

describe('patchChild 元素/Fragment/组件 patch 行为', () => {
  it('复用元素宿主并保证先更新 props 再 children 且重新绑定 ref', () => {
    const sequence: string[] = []
    const host = createHostRenderer({
      patchProps() {
        sequence.push('patchProps')
      },
      setText() {
        sequence.push('setText')
      },
    })
    const oldRefCalls: Array<TestElement | undefined> = []
    const newRefCalls: Array<TestElement | undefined> = []
    const previous = normalize(
      <div
        id="old"
        ref={(value?: TestElement) => {
          oldRefCalls.push(value)
          sequence.push(value ? 'old-ref:set' : 'old-ref:clear')
        }}
        onClick="previous"
      >
        before
      </div>,
    )
    const next = normalize(
      <div
        id="new"
        ref={(value?: TestElement) => {
          newRefCalls.push(value)
          sequence.push(value ? 'new-ref:set' : 'new-ref:clear')
        }}
        onClick="next"
      >
        after
      </div>,
    )

    mountChild(host.options, previous, { container: host.container })
    host.resetCounts()
    sequence.length = 0
    oldRefCalls.length = 0
    newRefCalls.length = 0

    patchChild(host.options, previous, next, { container: host.container })

    const runtimePrevious = asRuntimeVirtualNode<TestNode, TestElement, never>(previous)
    const runtimeNext = asRuntimeVirtualNode<TestNode, TestElement, never>(next)

    expect(runtimeNext.el).toBe(runtimePrevious.el)
    expect(host.counters.patchProps).toBe(1)
    expect(host.counters.setText).toBe(1)
    expect(sequence).toEqual(['old-ref:clear', 'patchProps', 'setText', 'new-ref:set'])
    expect(oldRefCalls).toEqual([undefined])
    expect(newRefCalls[0]).toBe(runtimeNext.el)
    expect(host.container.children[0]).toBe(runtimeNext.el)
  })

  it('Fragment 子节点 patch 应优先使用片段锚点而非父级锚点', () => {
    const host = createHostRenderer()
    const parentAnchor = host.options.createText('parent-anchor')
    const previous = normalize(['left'])
    const next = normalize(['left', 'inserted'])

    host.options.appendChild(host.container, parentAnchor)
    mountChild(host.options, previous, { container: host.container, anchor: parentAnchor })
    const runtimePrevious = asRuntimeVirtualNode<TestNode, TestElement, never>(previous)

    patchChild(host.options, previous, next, {
      container: host.container,
      anchor: parentAnchor,
    })

    const fragmentAnchor = runtimePrevious.anchor

    if (!fragmentAnchor) {
      throw new Error('expected fragment anchor')
    }

    const insertedIndex = host.container.children.findIndex((node) => {
      return node.text === 'inserted'
    })
    const fragmentAnchorIndex = host.container.children.indexOf(fragmentAnchor)
    const parentAnchorIndex = host.container.children.indexOf(parentAnchor)

    expect(insertedIndex).toBeGreaterThan(-1)
    expect(fragmentAnchorIndex).toBeGreaterThan(-1)
    expect(parentAnchorIndex).toBeGreaterThan(-1)
    expect(insertedIndex).toBeLessThan(fragmentAnchorIndex)
    expect(fragmentAnchorIndex).toBeLessThan(parentAnchorIndex)
  })

  it('组件重渲染抛错时保持旧子树不被替换', async () => {
    const renderCounts: number[] = []
    const ThrowingComponent: SetupComponent = () => {
      let renderCount = 0

      return () => {
        renderCounts.push(renderCount)

        if (renderCount > 0) {
          throw new Error('boom')
        }

        renderCount += 1

        return <span>stable</span>
      }
    }

    const host = createHostRenderer()
    const previous = normalize(<ThrowingComponent />)
    const next: NormalizedVirtualNode = normalize(<ThrowingComponent />)

    mountChild(host.options, previous, { container: host.container })

    host.resetCounts()

    const beforeNodes = [...host.container.children]

    patchChild(host.options, previous, next, { container: host.container })

    await nextTick()

    expect(host.counters.appendChild).toBe(0)
    expect(host.counters.insertBefore).toBe(0)
    expect(host.counters.remove).toBe(0)
    expect(host.container.children).toHaveLength(beforeNodes.length)

    for (const [index, node] of beforeNodes.entries()) {
      expect(host.container.children[index]).toBe(node)
    }

    expect(renderCounts).toEqual([0, 1])
  })
})
