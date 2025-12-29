import { describe, expect, it } from 'vitest'
import type { TestNode } from '../host-utils.ts'
import { createHostRenderer, normalize } from '../host-utils.ts'
import { mountChild } from '@/runtime-core/index.ts'
import { getFirstHostNode, getLastHostNode, move } from '@/runtime-core/patch/utils.ts'
import type { SetupComponent } from '@/index.ts'

describe('runtime-core patch utils: move', () => {
  it('Element/Text/Comment：移动单节点到指定锚点之前', () => {
    const host = createHostRenderer()
    const a = normalize(<div>a</div>)
    const b = normalize(<div>b</div>)

    mountChild(host.options, a, { container: host.container })
    mountChild(host.options, b, { container: host.container })

    const aNode = getFirstHostNode<TestNode>(a)
    const bNode = getFirstHostNode<TestNode>(b)

    expect(aNode).toBe(host.container.children[0])
    expect(bNode).toBe(host.container.children[1])

    move(host.options, b, host.container, aNode)

    expect(host.container.children[0]).toBe(bNode)
    expect(host.container.children[1]).toBe(aNode)
  })

  it('Fragment：用 nextSibling 遍历区间整体搬移', () => {
    const host = createHostRenderer()
    const fragment = normalize([<div>one</div>, <div>two</div>])
    const tail = normalize(<div>tail</div>)

    mountChild(host.options, fragment, { container: host.container })
    mountChild(host.options, tail, { container: host.container })

    expect(host.container.children).toHaveLength(5)

    const start = getFirstHostNode<TestNode>(fragment)
    const end = getLastHostNode<TestNode>(fragment)
    const oneNode = host.container.children[1]
    const twoNode = host.container.children[2]
    const tailNode = getFirstHostNode<TestNode>(tail)

    expect(start).toBe(host.container.children[0])
    expect(end).toBe(host.container.children[3])
    expect(tailNode).toBe(host.container.children[4])

    move(host.options, fragment, host.container)

    expect(host.container.children).toEqual([tailNode!, start!, oneNode, twoNode, end!])
  })

  it('Component：有组件锚点时整体搬移锚点区间', () => {
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

    expect(host.container.children).toHaveLength(6)

    const fragmentStart = getFirstHostNode<TestNode>(fragment)!
    const fragmentEnd = getLastHostNode<TestNode>(fragment)!
    const afterNode = getFirstHostNode<TestNode>(afterVNode)!
    const componentStart = getFirstHostNode<TestNode>(componentVNode)!
    const componentEnd = getLastHostNode<TestNode>(componentVNode)!
    const spanNode = host.container.children.find((node) => {
      return node.kind === 'element' && node.tag === 'span'
    })!

    move(host.options, componentVNode, host.container, fragmentEnd)

    expect(host.container.children).toEqual([
      fragmentStart,
      afterNode,
      componentStart,
      spanNode,
      componentEnd,
      fragmentEnd,
    ])
  })

  it('Component：无组件锚点时递归搬移 subTree', () => {
    const host = createHostRenderer()

    const Foo: SetupComponent = () => {
      return () => {
        return <span>foo</span>
      }
    }

    const fragment = normalize([<div>before</div>, <Foo />])
    const beforeVNode = fragment.children[0]
    const componentVNode = fragment.children[1]

    mountChild(host.options, fragment, { container: host.container })

    expect(host.container.children).toHaveLength(4)

    const fragmentStart = getFirstHostNode<TestNode>(fragment)!
    const fragmentEnd = getLastHostNode<TestNode>(fragment)!
    const beforeNode = getFirstHostNode<TestNode>(beforeVNode)!
    const spanNode = host.container.children.find((node) => {
      return node.kind === 'element' && node.tag === 'span'
    })!

    move(host.options, componentVNode, host.container, beforeNode)

    expect(host.container.children).toEqual([fragmentStart, spanNode, beforeNode, fragmentEnd])
  })
})
