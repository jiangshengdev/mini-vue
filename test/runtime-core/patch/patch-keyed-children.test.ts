import { describe, expect, it } from 'vitest'
import { createTestContainer } from '../../setup.ts'
import { domRendererOptions } from '@/runtime-dom/renderer-options.ts'
import { patchKeyedChildren } from '@/runtime-core/patch/keyed-children.ts'
import { mountChild } from '@/runtime-core/mount/child.ts'
import { createVirtualNode } from '@/jsx-foundation/index.ts'

/**
 * 创建带 key 的 VNode。
 */
function createKeyedVNode(key: string, content: string) {
  return createVirtualNode({
    type: 'li',
    rawProps: { children: [content] },
    key,
  })
}

/**
 * **Feature: vnode-diff-patch, Property 6: Keyed children 顺序与复用**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */
describe('patchKeyedChildren - Keyed children 顺序与复用', () => {
  it('节点重排保持引用不变', () => {
    const container = createTestContainer()

    /* mount 初始 keyed children */
    const oldVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
    ]
    const handles = oldVNodes.map((vnode) => {
      return mountChild(domRendererOptions, vnode, container)
    })
    const oldElements = handles.map((h) => {
      return h?.nodes[0] as HTMLElement
    })

    expect(container.textContent).toBe('ABC')

    /* patch：重排顺序为 C, B, A */
    const newVNodes = [
      createKeyedVNode('c', 'C'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('a', 'A'),
    ]
    const newHandles = patchKeyedChildren(
      domRendererOptions,
      oldVNodes,
      newVNodes,
      container,
      handles,
    )

    /* 验证节点引用保持不变（按 key 映射）。 */
    expect(newHandles[0]?.nodes[0]).toBe(oldElements[2]) // c
    expect(newHandles[1]?.nodes[0]).toBe(oldElements[1]) // b
    expect(newHandles[2]?.nodes[0]).toBe(oldElements[0]) // a

    /* 验证 DOM 顺序正确。 */
    const liElements = container.querySelectorAll('li')

    expect(liElements[0].textContent).toBe('C')
    expect(liElements[1].textContent).toBe('B')
    expect(liElements[2].textContent).toBe('A')
  })

  it('新增带 key 节点', () => {
    const container = createTestContainer()

    /* mount 初始 keyed children */
    const oldVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
    ]
    const handles = oldVNodes.map((vnode) => {
      return mountChild(domRendererOptions, vnode, container)
    })
    const oldElements = handles.map((h) => {
      return h?.nodes[0] as HTMLElement
    })

    expect(container.textContent).toBe('AB')

    /* patch：新增节点 c */
    const newVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
    ]
    const newHandles = patchKeyedChildren(
      domRendererOptions,
      oldVNodes,
      newVNodes,
      container,
      handles,
    )

    /* 验证旧节点引用保持不变。 */
    expect(newHandles[0]?.nodes[0]).toBe(oldElements[0])
    expect(newHandles[1]?.nodes[0]).toBe(oldElements[1])

    /* 验证新节点已挂载。 */
    expect(newHandles[2]?.nodes[0]).toBeInstanceOf(HTMLLIElement)
    expect(container.textContent).toBe('ABC')
  })

  it('删除带 key 节点', () => {
    const container = createTestContainer()

    /* mount 初始 keyed children */
    const oldVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
    ]
    const handles = oldVNodes.map((vnode) => {
      return mountChild(domRendererOptions, vnode, container)
    })
    const oldElements = handles.map((h) => {
      return h?.nodes[0] as HTMLElement
    })

    expect(container.textContent).toBe('ABC')

    /* patch：删除节点 b */
    const newVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('c', 'C'),
    ]
    const newHandles = patchKeyedChildren(
      domRendererOptions,
      oldVNodes,
      newVNodes,
      container,
      handles,
    )

    /* 验证保留节点引用不变。 */
    expect(newHandles[0]?.nodes[0]).toBe(oldElements[0])
    expect(newHandles[1]?.nodes[0]).toBe(oldElements[2])

    /* 验证被删除节点已从 DOM 移除。 */
    expect(newHandles.length).toBe(2)
    expect(container.textContent).toBe('AC')
  })

  it('复杂重排场景', () => {
    const container = createTestContainer()

    /* mount 初始 keyed children: a, b, c, d, e */
    const oldVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
      createKeyedVNode('d', 'D'),
      createKeyedVNode('e', 'E'),
    ]
    const handles = oldVNodes.map((vnode) => {
      return mountChild(domRendererOptions, vnode, container)
    })
    const oldElements = handles.map((h) => {
      return h?.nodes[0] as HTMLElement
    })

    expect(container.textContent).toBe('ABCDE')

    /* patch：重排为 e, d, c, b, a（完全反转）*/
    const newVNodes = [
      createKeyedVNode('e', 'E'),
      createKeyedVNode('d', 'D'),
      createKeyedVNode('c', 'C'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('a', 'A'),
    ]
    const newHandles = patchKeyedChildren(
      domRendererOptions,
      oldVNodes,
      newVNodes,
      container,
      handles,
    )

    /* 验证所有节点引用保持不变。 */
    expect(newHandles[0]?.nodes[0]).toBe(oldElements[4]) // e
    expect(newHandles[1]?.nodes[0]).toBe(oldElements[3]) // d
    expect(newHandles[2]?.nodes[0]).toBe(oldElements[2]) // c
    expect(newHandles[3]?.nodes[0]).toBe(oldElements[1]) // b
    expect(newHandles[4]?.nodes[0]).toBe(oldElements[0]) // a

    /* 验证 DOM 顺序正确。 */
    expect(container.textContent).toBe('EDCBA')
  })

  it('新增+删除+重排混合场景', () => {
    const container = createTestContainer()

    /* mount 初始 keyed children: a, b, c */
    const oldVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
    ]
    const handles = oldVNodes.map((vnode) => {
      return mountChild(domRendererOptions, vnode, container)
    })
    const oldElementA = handles[0]?.nodes[0] as HTMLElement
    const oldElementC = handles[2]?.nodes[0] as HTMLElement

    expect(container.textContent).toBe('ABC')

    /* patch：删除 b，新增 d，重排为 c, d, a */
    const newVNodes = [
      createKeyedVNode('c', 'C'),
      createKeyedVNode('d', 'D'),
      createKeyedVNode('a', 'A'),
    ]
    const newHandles = patchKeyedChildren(
      domRendererOptions,
      oldVNodes,
      newVNodes,
      container,
      handles,
    )

    /* 验证复用的节点引用不变。 */
    expect(newHandles[0]?.nodes[0]).toBe(oldElementC)
    expect(newHandles[2]?.nodes[0]).toBe(oldElementA)

    /* 验证新增节点。 */
    expect(newHandles[1]?.nodes[0]).toBeInstanceOf(HTMLLIElement)

    /* 验证 DOM 顺序正确。 */
    expect(container.textContent).toBe('CDA')
  })

  it('头部同步优化', () => {
    const container = createTestContainer()

    /* mount 初始 keyed children: a, b, c */
    const oldVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
    ]
    const handles = oldVNodes.map((vnode) => {
      return mountChild(domRendererOptions, vnode, container)
    })
    const oldElements = handles.map((h) => {
      return h?.nodes[0] as HTMLElement
    })

    /* patch：只在尾部新增 d */
    const newVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
      createKeyedVNode('d', 'D'),
    ]
    const newHandles = patchKeyedChildren(
      domRendererOptions,
      oldVNodes,
      newVNodes,
      container,
      handles,
    )

    /* 验证所有旧节点引用保持不变。 */
    expect(newHandles[0]?.nodes[0]).toBe(oldElements[0])
    expect(newHandles[1]?.nodes[0]).toBe(oldElements[1])
    expect(newHandles[2]?.nodes[0]).toBe(oldElements[2])

    /* 验证 DOM 顺序正确。 */
    expect(container.textContent).toBe('ABCD')
  })

  it('尾部同步优化', () => {
    const container = createTestContainer()

    /* mount 初始 keyed children: a, b, c */
    const oldVNodes = [
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
    ]
    const handles = oldVNodes.map((vnode) => {
      return mountChild(domRendererOptions, vnode, container)
    })
    const oldElements = handles.map((h) => {
      return h?.nodes[0] as HTMLElement
    })

    /* patch：在头部新增 z */
    const newVNodes = [
      createKeyedVNode('z', 'Z'),
      createKeyedVNode('a', 'A'),
      createKeyedVNode('b', 'B'),
      createKeyedVNode('c', 'C'),
    ]
    const newHandles = patchKeyedChildren(
      domRendererOptions,
      oldVNodes,
      newVNodes,
      container,
      handles,
    )

    /* 验证所有旧节点引用保持不变。 */
    expect(newHandles[1]?.nodes[0]).toBe(oldElements[0])
    expect(newHandles[2]?.nodes[0]).toBe(oldElements[1])
    expect(newHandles[3]?.nodes[0]).toBe(oldElements[2])

    /* 验证 DOM 顺序正确。 */
    expect(container.textContent).toBe('ZABC')
  })
})
