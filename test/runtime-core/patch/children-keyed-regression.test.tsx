import { describe, expect, it } from 'vitest'
import { createHostRenderer, normalize } from '../host-utils.ts'
import {
  asRuntimeVirtualNode,
  mountChild,
  patchChild,
  patchChildren,
} from '@/runtime-core/index.ts'

describe('patchChildren keyed diff 回归用例（当前应失败）', () => {
  it('混合 keyed + 无 key 且新列表完全逆序时不应残留多余节点', () => {
    const host = createHostRenderer()
    const previousChildren = [
      normalize(<div key="a">a</div>),
      normalize(<div>first</div>),
      normalize(<div>second</div>),
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

    const nextChildren = [
      normalize(<div>next-1</div>),
      normalize(<div>next-2</div>),
      normalize(<div key="a">a</div>),
    ]

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
        return node.kind === 'text' ? node.text : node.children[0]?.text
      }),
    ).toEqual(['next-1', 'next-2', 'a'])
    expect(host.container.children).toHaveLength(3)
    expect(nextRuntime[0].el).toBe(previousRuntime[1].el)
    expect(nextRuntime[1].el).toBe(previousRuntime[2].el)
    expect(nextRuntime[2].el).toBe(previousRuntime[0].el)
  })

  it('重复 key 场景应移除多余旧节点而不是留下冗余 DOM', () => {
    const host = createHostRenderer()
    const previousChildren = [
      normalize(<div key="dup">old-a</div>),
      normalize(<div key="b">b</div>),
      normalize(<div key="dup">old-b</div>),
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

    const nextChildren = [
      normalize(<div key="b">b</div>),
      normalize(<div key="dup">next</div>),
      normalize(<div key="c">c</div>),
    ]

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
        return node.kind === 'text' ? node.text : node.children[0]?.text
      }),
    ).toEqual(['b', 'next', 'c'])
    expect(host.container.children).toHaveLength(3)
    expect(host.counters.remove).toBe(1)
    expect(nextRuntime[0].el).toBe(previousRuntime[1].el)
    expect(
      nextRuntime[1].el === previousRuntime[0].el || nextRuntime[1].el === previousRuntime[2].el,
    ).toBe(true)
  })
})
