import { describe, expect, it } from 'vitest'
import { createTestContainer } from '../../setup.ts'
import { domRendererOptions } from '@/runtime-dom/renderer-options.ts'
import { patchChildren } from '@/runtime-core/patch/children.ts'
import { mountChild } from '@/runtime-core/mount/child.ts'

/**
 * **Feature: vnode-diff-patch, Property 5: 无 key children 索引对齐复用**
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
describe('patchChildren - 无 key 索引对齐', () => {
  it('公共区间内节点复用', () => {
    const container = createTestContainer()

    /* mount 初始 children */
    const handles = ['a', 'b', 'c'].map((text) => {
      return mountChild(domRendererOptions, text, container)
    })
    const oldNodes = handles.map((h) => {
      return h?.nodes[0]
    })

    expect(container.textContent).toBe('abc')

    /* patch 到相同长度的新 children */
    const newHandles = patchChildren(
      domRendererOptions,
      ['a', 'b', 'c'],
      ['x', 'y', 'z'],
      container,
      handles,
    )

    /* 验证节点引用保持不变 */
    for (let i = 0; i < 3; i++) {
      expect(newHandles[i]?.nodes[0]).toBe(oldNodes[i])
    }

    /* 验证内容已更新 */
    expect(container.textContent).toBe('xyz')
  })

  it('新增尾部 - 仅挂载新增节点', () => {
    const container = createTestContainer()

    /* mount 初始 children */
    const handles = ['a', 'b'].map((text) => {
      return mountChild(domRendererOptions, text, container)
    })
    const oldNodes = handles.map((h) => {
      return h?.nodes[0]
    })

    expect(container.textContent).toBe('ab')

    /* patch 追加新 children */
    const newHandles = patchChildren(
      domRendererOptions,
      ['a', 'b'],
      ['a', 'b', 'c', 'd'],
      container,
      handles,
    )

    /* 验证旧节点引用不变 */
    expect(newHandles[0]?.nodes[0]).toBe(oldNodes[0])
    expect(newHandles[1]?.nodes[0]).toBe(oldNodes[1])

    /* 验证新增节点已挂载 */
    expect(newHandles.length).toBe(4)
    expect(container.textContent).toBe('abcd')
  })

  it('截断尾部 - 仅卸载被移除节点', () => {
    const container = createTestContainer()

    /* mount 初始 children */
    const handles = ['a', 'b', 'c', 'd'].map((text) => {
      return mountChild(domRendererOptions, text, container)
    })
    const oldNodes = handles.map((h) => {
      return h?.nodes[0]
    })

    expect(container.textContent).toBe('abcd')

    /* patch 截断 children */
    const newHandles = patchChildren(
      domRendererOptions,
      ['a', 'b', 'c', 'd'],
      ['a', 'b'],
      container,
      handles,
    )

    /* 验证保留节点引用不变 */
    expect(newHandles[0]?.nodes[0]).toBe(oldNodes[0])
    expect(newHandles[1]?.nodes[0]).toBe(oldNodes[1])

    /* 验证被移除节点已从 DOM 移除 */
    expect(newHandles.length).toBe(2)
    expect(container.textContent).toBe('ab')
  })

  it('混合场景 - 更新 + 新增', () => {
    const container = createTestContainer()

    /* mount 初始 children */
    const handles = ['1', '2'].map((text) => {
      return mountChild(domRendererOptions, text, container)
    })
    const oldNodes = handles.map((h) => {
      return h?.nodes[0]
    })

    /* patch：更新旧节点 + 新增节点 */
    const newHandles = patchChildren(
      domRendererOptions,
      ['1', '2'],
      ['a', 'b', 'c'],
      container,
      handles,
    )

    /* 验证旧节点引用复用 */
    expect(newHandles[0]?.nodes[0]).toBe(oldNodes[0])
    expect(newHandles[1]?.nodes[0]).toBe(oldNodes[1])

    /* 验证内容更新 */
    expect(container.textContent).toBe('abc')
  })

  it('混合场景 - 更新 + 删除', () => {
    const container = createTestContainer()

    /* mount 初始 children */
    const handles = ['1', '2', '3'].map((text) => {
      return mountChild(domRendererOptions, text, container)
    })
    const oldNode0 = handles[0]?.nodes[0]

    /* patch：更新 + 删除 */
    const newHandles = patchChildren(
      domRendererOptions,
      ['1', '2', '3'],
      ['x'],
      container,
      handles,
    )

    /* 验证第一个节点引用复用 */
    expect(newHandles[0]?.nodes[0]).toBe(oldNode0)

    /* 验证内容更新 */
    expect(newHandles.length).toBe(1)
    expect(container.textContent).toBe('x')
  })

  it('空数组到非空数组', () => {
    const container = createTestContainer()

    /* 初始为空 */
    expect(container.textContent).toBe('')

    /* patch 从空到非空 */
    const newHandles = patchChildren(
      domRendererOptions,
      [],
      ['a', 'b'],
      container,
      [],
    )

    expect(newHandles.length).toBe(2)
    expect(container.textContent).toBe('ab')
  })

  it('非空数组到空数组', () => {
    const container = createTestContainer()

    /* mount 初始 children */
    const handles = ['a', 'b'].map((text) => {
      return mountChild(domRendererOptions, text, container)
    })

    expect(container.textContent).toBe('ab')

    /* patch 清空 */
    const newHandles = patchChildren(
      domRendererOptions,
      ['a', 'b'],
      [],
      container,
      handles,
    )

    expect(newHandles.length).toBe(0)
    expect(container.textContent).toBe('')
  })
})
