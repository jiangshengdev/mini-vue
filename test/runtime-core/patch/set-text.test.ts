import { describe, expect, it } from 'vitest'
import { domRendererOptions } from '@/runtime-dom/renderer-options.ts'

/**
 * **Feature: vnode-diff-patch, Property 1: 文本更新保持节点引用**
 * **Validates: Requirements 1.2, 6.1**
 */
describe('setText - 文本更新保持节点引用', () => {
  it('setText 更新内容后节点引用不变', () => {
    const { createText, setText } = domRendererOptions

    const textNode = createText('initial')

    expect(textNode.nodeValue).toBe('initial')

    setText(textNode, 'updated')

    expect(textNode.nodeValue).toBe('updated')
  })

  it('setText 多次更新后节点引用始终一致', () => {
    const { createText, setText } = domRendererOptions

    const textNode = createText('a')
    const originalRef = textNode

    setText(textNode, 'b')
    expect(textNode).toBe(originalRef)

    setText(textNode, 'c')
    expect(textNode).toBe(originalRef)

    expect(textNode.nodeValue).toBe('c')
  })

  it('setText 支持空字符串', () => {
    const { createText, setText } = domRendererOptions

    const textNode = createText('content')

    setText(textNode, '')

    expect(textNode.nodeValue).toBe('')
  })
})
