import { describe, expect, it } from 'vitest'
import { h } from '@/jsx-runtime'

describe('jsx-runtime h helper', () => {
  it('保留 props.children 当可变 children 为空', () => {
    const vnode = h('div', { children: 'slot-text' })

    expect(vnode.children).toEqual(['slot-text'])
    expect(vnode.props).toBeNull()
  })

  it('变参 children 覆盖 props.children', () => {
    const vnode = h('div', { children: 'slot-text' }, 'override')

    expect(vnode.children).toEqual(['override'])
    expect(vnode.props).toBeNull()
  })

  it('保留其他 props 并正确归一化 children', () => {
    const vnode = h(
      'section',
      { id: 'foo', children: 'stale-child' },
      'text-child',
      h('span', {}, 'nested'),
    )

    expect(vnode.children).toHaveLength(2)
    expect(vnode.children[0]).toBe('text-child')
    expect(vnode.props).toEqual({ id: 'foo' })
  })
})
