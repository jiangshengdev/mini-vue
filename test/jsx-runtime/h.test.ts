import { describe, expect, it } from 'vitest'
import { createTestContainer } from '$/index.ts'
import { h, render } from '@/index.ts'

describe('jsx-runtime h helper', () => {
  it('保留 props.children 当可变 children 为空', () => {
    const virtualNode = h('div', { children: 'slot-text' })

    expect(virtualNode.children).toEqual(['slot-text'])
    expect(virtualNode.props).toBeUndefined()
  })

  it('变参 children 覆盖 props.children', () => {
    const virtualNode = h('div', { children: 'slot-text' }, 'override')

    expect(virtualNode.children).toEqual(['override'])
    expect(virtualNode.props).toBeUndefined()
  })

  it('支持省略 props 直接传入可变 children', () => {
    const childNode = h('span', {}, 'inner')
    const virtualNode = h('div', undefined, 'text', childNode)

    expect(virtualNode.children).toEqual(['text', childNode])
    expect(virtualNode.props).toBeUndefined()
  })

  it('key 会影响子节点在 patch 时的复用与移动（黑盒）', () => {
    const container = createTestContainer()

    const previous = h(
      'ul',
      {},
      h('li', { key: 'a', 'data-id': 'a' }, 'a'),
      h('li', { key: 'b', 'data-id': 'b' }, 'b'),
      h('li', { key: 'c', 'data-id': 'c' }, 'c'),
    )

    render(previous, container)

    const a = container.querySelector('[data-id="a"]')
    const b = container.querySelector('[data-id="b"]')
    const c = container.querySelector('[data-id="c"]')

    if (!a || !b || !c) {
      throw new Error('expected rendered list items')
    }

    const next = h(
      'ul',
      {},
      h('li', { key: 'c', 'data-id': 'c' }, 'c'),
      h('li', { key: 'b', 'data-id': 'b' }, 'b'),
      h('li', { key: 'a', 'data-id': 'a' }, 'a'),
    )

    render(next, container)

    const texts = [...container.querySelectorAll('li')].map((node) => {
      return node.textContent
    })

    expect(texts).toEqual(['c', 'b', 'a'])
    expect(container.querySelector('[data-id="a"]')).toBe(a)
    expect(container.querySelector('[data-id="b"]')).toBe(b)
    expect(container.querySelector('[data-id="c"]')).toBe(c)
  })

  it('保留其他 props 并正确归一化 children', () => {
    const virtualNode = h(
      'section',
      { id: 'foo', children: 'stale-child' },
      'text-child',
      h('span', {}, 'nested'),
    )

    expect(virtualNode.children).toHaveLength(2)
    expect(virtualNode.children[0]).toBe('text-child')
    expect(virtualNode.props).toEqual({ id: 'foo' })
  })

  it('将 props.key 提升为 virtual-node.key', () => {
    const virtualNode = h('li', { key: 'row-1', children: 'row' })

    expect(virtualNode.key).toBe('row-1')
    expect(virtualNode.props).toBeUndefined()
  })
})
