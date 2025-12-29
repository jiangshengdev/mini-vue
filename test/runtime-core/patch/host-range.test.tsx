import { describe, expect, it } from 'vitest'
import type { TestNode } from '../host-utils.ts'
import { createHostRenderer, normalize } from '../host-utils.ts'
import { mountChild } from '@/runtime-core/index.ts'
import { getFirstHostNode, getLastHostNode, getNextHostNode } from '@/runtime-core/patch/utils.ts'
import type { SetupComponent } from '@/index.ts'

describe('runtime-core patch utils: host range helpers', () => {
  it('元素节点：first/last 为自身，next 为其下一个兄弟', () => {
    const host = createHostRenderer()
    const first = normalize(<div>first</div>)
    const second = normalize(<div>second</div>)

    mountChild(host.options, first, { container: host.container })
    mountChild(host.options, second, { container: host.container })

    expect(getFirstHostNode<TestNode>(first)).toBe(host.container.children[0])
    expect(getLastHostNode<TestNode>(first)).toBe(host.container.children[0])
    expect(getNextHostNode(host.options, first)).toBe(host.container.children[1])
  })

  it('Fragment：first 为 start anchor，last 为 end anchor，next 基于 end anchor 的 nextSibling', () => {
    const host = createHostRenderer()
    const fragment = normalize([<div>one</div>, <div>two</div>])
    const tail = normalize(<div>tail</div>)

    mountChild(host.options, fragment, { container: host.container })
    mountChild(host.options, tail, { container: host.container })

    expect(getFirstHostNode<TestNode>(fragment)).toBe(host.container.children[0])
    expect(getLastHostNode<TestNode>(fragment)).toBe(host.container.children[3])
    expect(getNextHostNode(host.options, fragment)).toBe(host.container.children[4])
  })

  it('组件：first/last 来源于 subTree，next 为其后继节点', () => {
    const host = createHostRenderer()

    const Foo: SetupComponent = () => {
      return () => {
        return <span>foo</span>
      }
    }

    const fragment = normalize([<Foo />, <div>after</div>])
    const componentVNode = fragment.children[0]
    const afterVNode = fragment.children[1]

    mountChild(host.options, fragment, { container: host.container })

    const componentFirst = getFirstHostNode<TestNode>(componentVNode)
    const componentLast = getLastHostNode<TestNode>(componentVNode)
    const afterFirst = getFirstHostNode<TestNode>(afterVNode)

    expect(componentFirst?.kind).toBe('element')
    expect(componentLast?.kind).toBe('element')
    expect(afterFirst?.kind).toBe('element')
    expect(getNextHostNode(host.options, componentVNode)).toBe(afterFirst)
  })
})
