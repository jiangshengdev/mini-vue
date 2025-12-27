import { describe, expect, it } from 'vitest'
import { createHostRenderer, normalize } from '../host-utils.ts'
import {
  asRuntimeVirtualNode,
  mountChild,
  patchChild,
  patchChildren,
} from '@/runtime-core/index.ts'

function createKeyedDivs(keys: string[]) {
  return keys.map((key) => {
    return normalize(<div key={key}>{key}</div>)
  })
}

function mountAll(
  host: ReturnType<typeof createHostRenderer>,
  children: ReturnType<typeof createKeyedDivs>,
) {
  for (const child of children) {
    mountChild(host.options, child, { container: host.container })
  }

  return children.map((child) => {
    return asRuntimeVirtualNode(child)
  })
}

function getOrder(host: ReturnType<typeof createHostRenderer>): string[] {
  return host.container.children.map((node) => {
    return node.kind === 'element' ? (node.children[0]?.text ?? '') : (node.text ?? '')
  })
}

describe('patchChildren keyed diff - LIS 优化', () => {
  it('顺序未变时不移动', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D'])
    const previousRuntime = mountAll(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['A', 'B', 'C', 'D'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getOrder(host)).toEqual(['A', 'B', 'C', 'D'])
    expect(
      nextRuntime.map((node) => {
        return node.el
      }),
    ).toEqual(
      previousRuntime.map((node) => {
        return node.el
      }),
    )
    expect(host.counters.insertBefore).toBe(0)
    expect(host.counters.appendChild).toBe(0)
  })

  it('尾元素移到首部只移动一次', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D'])
    const previousRuntime = mountAll(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['D', 'A', 'B', 'C'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getOrder(host)).toEqual(['D', 'A', 'B', 'C'])
    expect(nextRuntime[0].el).toBe(previousRuntime[3].el)
    expect(host.counters.insertBefore).toBe(1)
    expect(host.counters.appendChild).toBe(0)
  })

  it('首元素移到尾部追加一次', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D'])
    const previousRuntime = mountAll(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['B', 'C', 'D', 'A'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getOrder(host)).toEqual(['B', 'C', 'D', 'A'])
    expect(nextRuntime[3].el).toBe(previousRuntime[0].el)
    expect(host.counters.insertBefore).toBe(0)
    expect(host.counters.appendChild).toBe(1)
  })

  it('首尾元素交换时分别移动到位', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountAll(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['F', 'B', 'C', 'D', 'E', 'A'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getOrder(host)).toEqual(['F', 'B', 'C', 'D', 'E', 'A'])
    expect(nextRuntime[0].el).toBe(previousRuntime[5].el) // F 移到首部
    expect(nextRuntime[5].el).toBe(previousRuntime[0].el) // A 移到尾部
    expect(host.counters.remove).toBe(0)
    expect(host.counters.insertBefore).toBe(1)
    expect(host.counters.appendChild).toBe(1)
  })

  it('单个中间元素前移只移动一次', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E', 'F'])
    const previousRuntime = mountAll(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['A', 'D', 'B', 'C', 'E', 'F'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getOrder(host)).toEqual(['A', 'D', 'B', 'C', 'E', 'F'])
    expect(nextRuntime[1].el).toBe(previousRuntime[3].el)
    expect(host.counters.insertBefore).toBe(1)
    expect(host.counters.appendChild).toBe(0)
  })

  it('多元素重排时仅需最少移动', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E'])
    const previousRuntime = mountAll(host, previousChildren)

    host.resetCounts()

    const nextChildren = createKeyedDivs(['C', 'E', 'A', 'B', 'D'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getOrder(host)).toEqual(['C', 'E', 'A', 'B', 'D'])
    expect(nextRuntime[0].el).toBe(previousRuntime[2].el) // C
    expect(nextRuntime[1].el).toBe(previousRuntime[4].el) // E
    expect(nextRuntime[2].el).toBe(previousRuntime[0].el) // A
    expect(nextRuntime[3].el).toBe(previousRuntime[1].el) // B
    expect(nextRuntime[4].el).toBe(previousRuntime[3].el) // D
    expect(host.counters.remove).toBe(0)
    expect(host.counters.insertBefore + host.counters.appendChild).toBe(2)
  })

  it('LIS 位置不连续时只移动非 LIS 节点', () => {
    const host = createHostRenderer()
    const previousChildren = createKeyedDivs(['A', 'B', 'C', 'D', 'E'])
    const previousRuntime = mountAll(host, previousChildren)

    host.resetCounts()

    /* 映射为 [4,0,3,1,2]，LIS 偏移为 [1,3,4]，跳过了偏移 2（D）。 */
    const nextChildren = createKeyedDivs(['E', 'A', 'D', 'B', 'C'])

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const nextRuntime = nextChildren.map((child) => {
      return asRuntimeVirtualNode(child)
    })

    expect(getOrder(host)).toEqual(['E', 'A', 'D', 'B', 'C'])
    /* E、D 需要移动，其余节点保持相对顺序。 */
    expect(nextRuntime[0].el).toBe(previousRuntime[4].el)
    expect(nextRuntime[2].el).toBe(previousRuntime[3].el)
    expect(host.counters.remove).toBe(0)
    expect(host.counters.insertBefore).toBe(2)
    expect(host.counters.appendChild).toBe(0)
  })
})
