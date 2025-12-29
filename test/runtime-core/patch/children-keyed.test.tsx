import { describe, expect, it } from 'vitest'
import type { TestNode } from '../host-utils.ts'
import { createHostRenderer, normalize } from '../host-utils.ts'
import {
  asRuntimeVirtualNode,
  mountChild,
  patchChild,
  patchChildren,
} from '@/runtime-core/index.ts'
import { Fragment, nextTick, ref } from '@/index.ts'
import { createTextVirtualNode } from '@/jsx-foundation/index.ts'

function collectLeafTexts(node: TestNode, output: string[]): void {
  if (node.kind === 'text') {
    output.push(node.text ?? '')

    return
  }

  for (const child of node.children) {
    collectLeafTexts(child, output)
  }
}

describe('patchChildren 有 key diff', () => {
  it('移动可复用 keyed 节点且不重新挂载', () => {
    const host = createHostRenderer()
    const previousChildren = [
      normalize(<div key="a">a</div>),
      normalize(<div key="b">b</div>),
      normalize(<div key="c">c</div>),
    ]
    const nextChildren = [
      normalize(<div key="b">b</div>),
      normalize(<div key="a">a</div>),
      normalize(<div key="c">c</div>),
    ]

    for (const [index, child] of previousChildren.entries()) {
      mountChild(host.options, child, {
        container: host.container,
        context: { shouldUseAnchor: index < previousChildren.length - 1 },
      })
    }

    const previousRuntime = previousChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    host.resetCounts()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(host.counters.appendChild).toBe(0)
    expect(host.counters.remove).toBe(0)
    expect(host.container.children).toEqual([
      previousRuntime[1].el,
      previousRuntime[0].el,
      previousRuntime[2].el,
    ])
    expect(nextRuntime[0].el).toBe(previousRuntime[1].el)
    expect(nextRuntime[1].el).toBe(previousRuntime[0].el)
  })

  it('Fragment keyed 顺序不变时不应触发移动', () => {
    const host = createHostRenderer()
    const previousChildren = [
      normalize(
        <Fragment key="a">
          <span>A1</span>
          <span>A2</span>
        </Fragment>,
      ),
      normalize(
        <Fragment key="b">
          <span>B1</span>
        </Fragment>,
      ),
    ]

    for (const child of previousChildren) {
      mountChild(host.options, child, { container: host.container })
    }

    const initialOrder: string[] = []

    for (const node of host.container.children) {
      collectLeafTexts(node, initialOrder)
    }

    host.resetCounts()

    const nextChildren = [
      normalize(
        <Fragment key="a">
          <span>A1</span>
          <span>A2</span>
        </Fragment>,
      ),
      normalize(
        <Fragment key="b">
          <span>B1</span>
        </Fragment>,
      ),
    ]

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextOrder: string[] = []

    for (const node of host.container.children) {
      collectLeafTexts(node, nextOrder)
    }

    expect(nextOrder.filter(Boolean)).toEqual(initialOrder.filter(Boolean))
    expect(host.counters.insertBefore).toBe(0)
    expect(host.counters.appendChild).toBe(0)
    expect(host.counters.remove).toBe(0)
  })

  it('Fragment keyed 重新排序仅移动必要节点', () => {
    const host = createHostRenderer()
    const previousChildren = [
      normalize(
        <Fragment key="a">
          <span>A1</span>
          <span>A2</span>
        </Fragment>,
      ),
      normalize(
        <Fragment key="b">
          <span>B1</span>
        </Fragment>,
      ),
    ]

    for (const child of previousChildren) {
      mountChild(host.options, child, { container: host.container })
    }

    host.resetCounts()

    const nextChildren = [
      normalize(
        <Fragment key="b">
          <span>B1</span>
        </Fragment>,
      ),
      normalize(
        <Fragment key="a">
          <span>A1</span>
          <span>A2</span>
        </Fragment>,
      ),
    ]

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextOrder: string[] = []

    for (const node of host.container.children) {
      collectLeafTexts(node, nextOrder)
    }

    expect(nextOrder.filter(Boolean)).toEqual(['B1', 'A1', 'A2'])
    /* Fragment B 仅包含一个宿主节点，移动一次即可到位。 */
    expect(host.counters.insertBefore).toBe(1)
    expect(host.counters.appendChild).toBe(0)
    expect(host.counters.remove).toBe(0)
  })

  it('混合 keyed 与无 key 节点：卸载缺失并挂载新增 key', () => {
    const host = createHostRenderer()
    const previousChildren = [
      normalize(<div key="a">a</div>),
      normalize(<div key="b">b</div>),
      normalize(<i>text</i>),
    ]
    const nextChildren = [
      normalize(<div key="a">a</div>),
      normalize(<div key="c">c</div>),
      normalize(<i>text</i>),
    ]

    for (const child of previousChildren) {
      mountChild(host.options, child, { container: host.container })
    }

    const reusedUnkeyed = asRuntimeVirtualNode(previousChildren[2]).el

    host.resetCounts()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    expect(host.counters.remove).toBe(1)
    expect(host.counters.insertBefore).toBe(1)
    expect(
      host.container.children.map((node) => {
        return node.kind === 'element' ? node.tag : node.text
      }),
    ).toEqual(['div', 'div', 'i'])
    expect(host.container.children[2]).toBe(reusedUnkeyed)
  })

  it('同 key 不同类型视为替换并按锚点插入', () => {
    const host = createHostRenderer()
    const previousChildren = [normalize(<div key="a">old</div>), normalize(<div key="b">b</div>)]

    for (const [index, child] of previousChildren.entries()) {
      mountChild(host.options, child, {
        container: host.container,
        context: { shouldUseAnchor: index < previousChildren.length - 1 },
      })
    }

    const previousRuntime = previousChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    host.resetCounts()

    const nextChildren = [normalize(<span key="a">new</span>), normalize(<div key="b">b</div>)]

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(host.counters.remove).toBe(1)
    expect(host.counters.insertBefore).toBe(1)
    expect(
      host.container.children.map((node) => {
        return node.kind === 'element' ? node.tag : node.text
      }),
    ).toEqual(['span', 'div'])
    expect(nextRuntime[0].el).not.toBe(previousRuntime[0].el)
    expect(nextRuntime[1].el).toBe(previousRuntime[1].el)
  })

  it('Text 节点 keyed diff 应按 key 移动而非忽略 key', () => {
    const host = createHostRenderer()
    const createKeyedText = (content: string, key: PropertyKey) => {
      return { ...createTextVirtualNode(content), key }
    }

    const textA = createKeyedText('A', '1')
    const textB = createKeyedText('B', '2')

    const previousChildren = [normalize(textA), normalize(textB)]

    for (const [index, child] of previousChildren.entries()) {
      mountChild(host.options, child, {
        container: host.container,
        context: { shouldUseAnchor: index < previousChildren.length - 1 },
      })
    }

    const previousRuntime = previousChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    host.resetCounts()

    const nextTextB = createKeyedText('B', '2')
    const nextTextA = createKeyedText('A', '1')

    const nextChildren = [normalize(nextTextB), normalize(nextTextA)]

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(
      host.container.children.map((node) => {
        return node.kind === 'text' ? node.text : node.tag
      }),
    ).toEqual(['B', 'A'])
    expect(nextRuntime[0].el).toBe(previousRuntime[1].el)
    expect(nextRuntime[1].el).toBe(previousRuntime[0].el)
    expect(host.counters.remove).toBe(0)
    expect(host.counters.insertBefore).toBe(1)
  })

  it('使用最长递增子序列优化减少移动次数', () => {
    const host = createHostRenderer()
    const previousChildren = [
      normalize(<div key="a">A</div>),
      normalize(<div key="b">B</div>),
      normalize(<div key="c">C</div>),
      normalize(<div key="d">D</div>),
    ]
    const nextChildren = [
      normalize(<div key="d">D</div>),
      normalize(<div key="a">A</div>),
      normalize(<div key="b">B</div>),
      normalize(<div key="c">C</div>),
    ]

    for (const child of previousChildren) {
      mountChild(host.options, child, { container: host.container })
    }

    const previousRuntime = previousChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    host.resetCounts()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(
      host.container.children.map((node) => {
        return node.kind === 'element' ? node.tag : node.text
      }),
    ).toEqual(['div', 'div', 'div', 'div'])
    expect(nextRuntime[0].el).toBe(previousRuntime[3].el)
    expect(nextRuntime[1].el).toBe(previousRuntime[0].el)
    expect(nextRuntime[2].el).toBe(previousRuntime[1].el)
    expect(nextRuntime[3].el).toBe(previousRuntime[2].el)
    expect(host.counters.appendChild).toBe(0)
    expect(host.counters.remove).toBe(0)
    expect(host.counters.insertBefore).toBe(1)
  })

  it('新列表重复 key 时额外节点需重挂并清理旧节点', () => {
    const host = createHostRenderer()
    const previousChildren = [normalize(<div key="a">a</div>), normalize(<div key="b">b</div>)]
    const nextChildren = [
      normalize(<div key="a">first-a</div>),
      normalize(<div key="a">second-a</div>),
    ]

    for (const child of previousChildren) {
      mountChild(host.options, child, { container: host.container })
    }

    const firstRuntime = asRuntimeVirtualNode(previousChildren[0])

    host.resetCounts()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    expect(host.counters.remove).toBe(1)
    expect(host.counters.appendChild).toBe(2)
    expect(host.counters.insertBefore).toBe(0)
    expect(host.container.children).toHaveLength(2)
    expect(host.container.children[0]).toBe(firstRuntime.el)
    expect(host.container.children[1]).not.toBeUndefined()
    expect(host.container.children[1]).not.toBe(firstRuntime.el)
  })

  it('组件移动后 rerender 仍按锚点顺序插入', async () => {
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
    const previousChildren = [normalize(<ComponentA key="a" />), normalize(<ComponentB key="b" />)]

    for (const child of previousChildren) {
      mountChild(host.options, child, { container: host.container })
    }

    host.resetCounts()

    const nextChildren = [normalize(<ComponentB key="b" />), normalize(<ComponentA key="a" />)]

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const runtimeB = asRuntimeVirtualNode(nextChildren[0])
    const runtimeA = asRuntimeVirtualNode(nextChildren[1])
    const anchorABefore = runtimeA.component?.endAnchor

    expect(host.container.children[0]).toBe(runtimeB.el)
    expect(anchorABefore && host.container.children.at(-1)).toBe(anchorABefore)

    componentA.expand()

    await nextTick()

    const elementOrder = host.container.children
      .filter((node) => {
        return node.kind === 'element'
      })
      .map((node) => {
        return node.children[0]?.text
      })

    expect(elementOrder).toEqual(['B', 'A-1', 'A-2'])

    const anchorAAfter = runtimeA.component?.endAnchor

    expect(anchorAAfter && host.container.children.at(-1)).toBe(anchorAAfter)
  })
})
