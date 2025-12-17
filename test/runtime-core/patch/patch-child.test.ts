import { describe, expect, it } from 'vitest'
import { createTestContainer } from '../../setup.ts'
import { domRendererOptions } from '@/runtime-dom/renderer-options.ts'
import { patchChild } from '@/runtime-core/patch/index.ts'
import { mountChild } from '@/runtime-core/mount/child.ts'
import { createVirtualNode } from '@/jsx-foundation/index.ts'

/**
 * **Feature: vnode-diff-patch, Property 1: 文本更新保持节点引用**
 * **Validates: Requirements 1.2, 6.1**
 */
describe('patchChild - 文本更新', () => {
  it('文本内容变化时复用同一 TextNode', () => {
    const container = createTestContainer()
    const oldHandle = mountChild(domRendererOptions, 'hello', container)
    const textNode = oldHandle?.nodes[0]

    expect(textNode).toBeDefined()
    expect((textNode as Text).nodeValue).toBe('hello')

    const newHandle = patchChild(
      domRendererOptions,
      'hello',
      'world',
      container,
      undefined,
      oldHandle,
    )

    expect(newHandle?.nodes[0]).toBe(textNode)
    expect((textNode as Text).nodeValue).toBe('world')
  })

  it('数字和字符串之间可复用 TextNode', () => {
    const container = createTestContainer()
    const oldHandle = mountChild(domRendererOptions, 123, container)
    const textNode = oldHandle?.nodes[0]

    const newHandle = patchChild(
      domRendererOptions,
      123,
      'abc',
      container,
      undefined,
      oldHandle,
    )

    expect(newHandle?.nodes[0]).toBe(textNode)
    expect((textNode as Text).nodeValue).toBe('abc')
  })
})

/**
 * **Feature: vnode-diff-patch, Property 2: 类型切换正确替换**
 * **Validates: Requirements 1.3**
 */
describe('patchChild - 类型切换', () => {
  it('text → element 正确替换', () => {
    const container = createTestContainer()
    const oldHandle = mountChild(domRendererOptions, 'text', container)

    expect(container.textContent).toBe('text')

    const newVNode = createVirtualNode({
      type: 'div',
      rawProps: { id: 'new', children: ['content'] },
    })
    const newHandle = patchChild(
      domRendererOptions,
      'text',
      newVNode,
      container,
      undefined,
      oldHandle,
    )

    expect(newHandle?.nodes[0]).toBeInstanceOf(HTMLDivElement)
    expect((newHandle?.nodes[0] as HTMLElement).id).toBe('new')
    expect(container.textContent).toBe('content')
  })

  it('element → text 正确替换', () => {
    const container = createTestContainer()
    const oldVNode = createVirtualNode({
      type: 'span',
      rawProps: { children: ['old'] },
    })
    const oldHandle = mountChild(domRendererOptions, oldVNode, container)

    expect(container.querySelector('span')).not.toBeNull()

    const newHandle = patchChild(
      domRendererOptions,
      oldVNode,
      'new text',
      container,
      undefined,
      oldHandle,
    )

    expect(newHandle?.nodes[0]).toBeInstanceOf(Text)
    expect(container.textContent).toBe('new text')
    expect(container.querySelector('span')).toBeNull()
  })

  it('div → span 正确替换', () => {
    const container = createTestContainer()
    const oldVNode = createVirtualNode({
      type: 'div',
      rawProps: { class: 'old', children: ['old'] },
    })
    const oldHandle = mountChild(domRendererOptions, oldVNode, container)
    const oldElement = oldHandle?.nodes[0] as HTMLElement

    expect(oldElement.tagName).toBe('DIV')

    const newVNode = createVirtualNode({
      type: 'span',
      rawProps: { class: 'new', children: ['new'] },
    })
    const newHandle = patchChild(
      domRendererOptions,
      oldVNode,
      newVNode,
      container,
      undefined,
      oldHandle,
    )
    const newElement = newHandle?.nodes[0] as HTMLElement

    expect(newElement).not.toBe(oldElement)
    expect(newElement.tagName).toBe('SPAN')
    expect(newElement.className).toBe('new')
  })
})

/**
 * **Feature: vnode-diff-patch, Property 3: Element props 差量更新**
 * **Validates: Requirements 2.1**
 */
describe('patchChild - Element props 更新', () => {
  it('同类型 element 复用节点并更新 props', () => {
    const container = createTestContainer()
    const oldVNode = createVirtualNode({
      type: 'div',
      rawProps: { id: 'old', class: 'foo', children: ['content'] },
    })
    const oldHandle = mountChild(domRendererOptions, oldVNode, container)
    const element = oldHandle?.nodes[0] as HTMLElement

    expect(element.id).toBe('old')
    expect(element.className).toBe('foo')

    const newVNode = createVirtualNode({
      type: 'div',
      rawProps: { id: 'new', title: 'bar', children: ['content'] },
    })
    const newHandle = patchChild(
      domRendererOptions,
      oldVNode,
      newVNode,
      container,
      undefined,
      oldHandle,
    )

    expect(newHandle?.nodes[0]).toBe(element)
    expect(element.id).toBe('new')
    expect(element.className).toBe('')
    expect(element.title).toBe('bar')
  })

  it('带 key 的同类型 element 可复用', () => {
    const container = createTestContainer()
    const oldVNode = createVirtualNode({
      type: 'li',
      rawProps: { children: ['item a'] },
      key: 'a',
    })
    const oldHandle = mountChild(domRendererOptions, oldVNode, container)
    const element = oldHandle?.nodes[0] as HTMLElement

    const newVNode = createVirtualNode({
      type: 'li',
      rawProps: { children: ['item a updated'] },
      key: 'a',
    })
    const newHandle = patchChild(
      domRendererOptions,
      oldVNode,
      newVNode,
      container,
      undefined,
      oldHandle,
    )

    expect(newHandle?.nodes[0]).toBe(element)
    expect(element.textContent).toBe('item a updated')
  })

  it('不同 key 的同类型 element 不复用', () => {
    const container = createTestContainer()
    const oldVNode = createVirtualNode({
      type: 'li',
      rawProps: { children: ['item a'] },
      key: 'a',
    })
    const oldHandle = mountChild(domRendererOptions, oldVNode, container)
    const oldElement = oldHandle?.nodes[0] as HTMLElement

    const newVNode = createVirtualNode({
      type: 'li',
      rawProps: { children: ['item b'] },
      key: 'b',
    })
    const newHandle = patchChild(
      domRendererOptions,
      oldVNode,
      newVNode,
      container,
      undefined,
      oldHandle,
    )

    expect(newHandle?.nodes[0]).not.toBe(oldElement)
  })
})
