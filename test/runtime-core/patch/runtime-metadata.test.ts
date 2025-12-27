import { describe, expect, it } from 'vitest'
import type { TestElement, TestFragment, TestNode } from '../host-utils.ts'
import { createHostRenderer, normalize } from '../host-utils.ts'
import { asRuntimeVirtualNode, mountChild, patchChild } from '@/runtime-core/index.ts'
import { createTextVirtualNode } from '@/jsx-foundation/index.ts'

describe('patchChild 运行时元数据复用', () => {
  it('更新文本节点时复用宿主绑定和 handle', () => {
    const host = createHostRenderer()
    const previous = normalize(createTextVirtualNode('before'))
    const next = normalize(createTextVirtualNode('after'))
    const mounted = mountChild(host.options, previous, { container: host.container })

    expect(mounted?.nodes).toHaveLength(1)

    const runtimePrevious = asRuntimeVirtualNode<TestNode, TestElement, TestFragment>(previous)

    patchChild(host.options, previous, next, { container: host.container })

    const runtimeNext = asRuntimeVirtualNode<TestNode, TestElement, TestFragment>(next)

    expect(runtimeNext.el).toBe(runtimePrevious.el)
    expect(runtimeNext.handle).toBe(runtimePrevious.handle)
    expect(runtimeNext.anchor).toBe(runtimePrevious.anchor)
    expect(runtimeNext.component).toBeUndefined()
    expect(runtimeNext.el?.text).toBe('after')
  })
})
