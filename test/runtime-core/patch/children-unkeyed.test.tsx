import { describe, expect, it, vi } from 'vitest'
import { createHostRenderer, normalize } from './test-utils.ts'
import { mountChild, patchChild, patchChildren } from '@/runtime-core/index.ts'
import { ref } from '@/index.ts'

describe('patchChildren 无 key diff', () => {
  it('公共区间按派生锚点上下文 patch', () => {
    const host = createHostRenderer()
    const previousChildren = [normalize(<p>a</p>), normalize(<p>b</p>)]
    const nextChildren = [normalize(<p>a1</p>), normalize(<p>b1</p>)]
    const anchor = host.options.createText('tail-anchor')
    const patchSpy = vi.fn()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      anchor,
      patchChild: patchSpy,
    })

    expect(patchSpy).toHaveBeenCalledTimes(2)
    const [firstCall, secondCall] = patchSpy.mock.calls

    expect(firstCall?.[3]?.anchor).toBe(anchor)
    expect(firstCall?.[3]?.context?.shouldUseAnchor).toBe(true)
    expect(secondCall?.[3]?.anchor).toBe(anchor)
    expect(secondCall?.[3]?.context?.shouldUseAnchor).toBe(false)
  })

  it('追加新子节点时优先插入到父级锚点之前', () => {
    const host = createHostRenderer()
    const parentAnchor = host.options.createText('parent-anchor')
    const previousChildren = [normalize(<div>kept</div>)]
    const nextChildren = [normalize(<div>kept</div>), normalize(<span>added</span>)]

    mountChild(host.options, previousChildren[0], { container: host.container })
    host.options.appendChild(host.container, parentAnchor)
    host.resetCounts()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      anchor: parentAnchor,
      patchChild,
    })

    expect(host.counters.insertBefore).toBe(1)
    expect(
      host.container.children.map((node) => {
        return node.kind === 'text' ? node.text : node.tag
      }),
    ).toEqual(['div', 'span', 'parent-anchor'])
  })

  it('新列表更短时移除末尾多余子节点', () => {
    const host = createHostRenderer()
    const previousChildren = [normalize(<div>kept</div>), normalize(<p>drop</p>)]
    const nextChildren = [normalize(<div>kept</div>)]

    for (const [index, child] of previousChildren.entries()) {
      mountChild(host.options, child, {
        container: host.container,
        context: { shouldUseAnchor: index < previousChildren.length - 1 },
      })
    }

    host.resetCounts()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    expect(host.counters.remove).toBe(1)
    expect(
      host.container.children.map((node) => {
        return node.kind === 'element' ? node.tag : node.text
      }),
    ).toEqual(['div'])
  })

  it('组件 rerender 切换多节点时保持顺序', () => {
    const host = createHostRenderer()
    const createToggleComponent = (label: string) => {
      const expanded = ref(false)

      const Component = () => {
        return () => {
          return expanded.value ? (
            [<span>{`${label}-1`}</span>, <span>{`${label}-2`}</span>]
          ) : (
            <span>{label}</span>
          )
        }
      }

      return {
        Component,
        expand() {
          expanded.value = true
        },
      }
    }

    const componentA = createToggleComponent('A')
    const componentB = createToggleComponent('B')
    const ComponentA = componentA.Component
    const ComponentB = componentB.Component
    const previousChildren = [normalize(<ComponentA />), normalize(<ComponentB />)]
    const nextChildren = [normalize(<ComponentA />), normalize(<ComponentB />)]

    patchChildren(host.options, [], previousChildren, {
      container: host.container,
      patchChild,
    })

    host.resetCounts()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    componentA.expand()

    const elementOrder = host.container.children
      .filter((node) => {
        return node.kind === 'element'
      })
      .map((node) => {
        return node.children[0]?.text
      })

    expect(elementOrder).toEqual(['A-1', 'A-2', 'B'])
  })
})
