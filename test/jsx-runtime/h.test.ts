import { describe, expect, it } from 'vitest'
import { h } from '@/jsx-runtime.ts'

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
    expect(virtualNode.key).toBeUndefined()
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
