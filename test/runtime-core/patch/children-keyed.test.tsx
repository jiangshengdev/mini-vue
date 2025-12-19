import { describe, expect, it } from 'vitest'
import { createHostRenderer, normalize } from './test-utils.ts'
import { asRuntimeVNode, mountChild, patchChild, patchChildren } from '@/runtime-core/index.ts'

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

    for (const child of previousChildren) {
      mountChild(host.options, child, { container: host.container })
    }

    const previousRuntime = previousChildren.map((child) => {
      return asRuntimeVNode(child)
    })

    host.resetCounts()

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVNode(child)
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

    const reusedUnkeyed = asRuntimeVNode(previousChildren[2]).el

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

    const firstRuntime = asRuntimeVNode(previousChildren[0])

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
})
