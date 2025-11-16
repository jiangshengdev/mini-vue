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
})
