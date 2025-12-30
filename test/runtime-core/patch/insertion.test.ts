import { spyOnConsole } from '$/test-utils/mocks.ts'
import { describe, expect, it } from 'vitest'
import { createHostRenderer, type TestElement, type TestFragment, type TestNode } from '../host-utils.ts'
import {
  getHostNodesSafely,
  mountChild,
  normalizeRenderOutput,
  patchChild,
} from '@/runtime-core/index.ts'
import { createTextVirtualNode } from '@/jsx-foundation/index.ts'
import { __DEV__ } from '@/shared/index.ts'

describe('patch 插入与诊断', () => {
  it('mountChild 在 anchor 处插入，不额外调用 append', () => {
    const host = createHostRenderer()
    const anchor = host.options.createText('anchor')

    host.options.appendChild(host.container, anchor)
    host.resetCounts()

    mountChild(host.options, createTextVirtualNode('hello'), {
      container: host.container,
      anchor,
    })

    expect(host.counters.insertBefore).toBe(1)
    expect(host.counters.appendChild).toBe(0)
    expect(
      host.container.children.map((node) => {
        return node.text
      }),
    ).toEqual(['hello', 'anchor'])
  })

  it('patchChild 新节点使用 anchor 单次插入', () => {
    const host = createHostRenderer()
    const anchor = host.options.createText('anchor')

    host.options.appendChild(host.container, anchor)
    host.resetCounts()

    const next = normalizeRenderOutput(createTextVirtualNode('patched'))!
    const result = patchChild(host.options, undefined, next, {
      container: host.container,
      anchor,
    })

    expect(host.counters.insertBefore).toBe(1)
    expect(host.counters.appendChild).toBe(0)
    expect(result?.ok).toBe(true)
    expect(result?.usedAnchor).toBe(anchor)
    expect(
      host.container.children.map((node) => {
        return node.text
      }),
    ).toEqual(['patched', 'anchor'])
  })

  it('getHostNodesSafely 在 DEV 模式下当运行时节点缺失时发出警告', () => {
    const virtualNode = normalizeRenderOutput(createTextVirtualNode('lonely'))!
    const warn = spyOnConsole('warn')

    getHostNodesSafely<TestNode, TestElement, TestFragment>(virtualNode)

    if (__DEV__) {
      expect(warn).toHaveBeenCalledOnce()
    } else {
      expect(warn).not.toHaveBeenCalled()
    }
  })
})
