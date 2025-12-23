import { describe, expect, it, vi } from 'vitest'
import type { TestElement, TestFragment, TestNode } from '../patch/test-utils.ts'
import { createHostRenderer } from '../patch/test-utils.ts'
import { createRenderlessComponent } from '$/index.ts'
import type { ComponentInstance } from '@/runtime-core/index.ts'
import { mountComponentSubtreeWithAnchors } from '@/runtime-core/index.ts'
import type { SetupComponent } from '@/index.ts'
import { effectScope } from '@/index.ts'

describe('mountComponentSubtreeWithAnchors', () => {
  it('逐个插入 fragment 子节点，不要求宿主 insertBefore 处理 fragment', () => {
    const host = createHostRenderer()
    const insertBefore = vi.spyOn(host.options, 'insertBefore')
    const container: TestElement = { kind: 'element', tag: 'root', children: [] }
    const component = createRenderlessComponent()

    const instance: ComponentInstance<TestNode, TestElement, TestFragment, SetupComponent> = {
      provides: {},
      type: component,
      container,
      props: {},
      propsSource: {},
      render() {
        return undefined
      },
      scope: effectScope(),
      shouldUseAnchor: true,
      cleanupTasks: [],
      setupContext: {},
    }

    const mounted = mountComponentSubtreeWithAnchors(host.options, instance, 'child')

    expect(mounted?.nodes).toHaveLength(3)
    expect(insertBefore).toHaveBeenCalledTimes(1)
    expect(
      insertBefore.mock.calls.some(([, child]) => {
        return child.kind === 'fragment'
      }),
    ).toBe(false)
    expect(container.children).toHaveLength(3)
    const [first, second, third] = container.children

    expect(first).toBe(instance.startAnchor)
    expect(second.text).toBe('child')
    expect(third).toBe(instance.endAnchor)

    const passedChildren = insertBefore.mock.calls.map(([, child]) => {
      return child
    })

    expect(
      passedChildren.every((child) => {
        return child.kind !== 'fragment'
      }),
    ).toBe(true)
  })
})
