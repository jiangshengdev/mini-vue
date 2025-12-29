import { describe, expect, it } from 'vitest'
import type { TestNode } from '../host-utils.ts'
import { createHostRenderer, normalize } from '../host-utils.ts'
import { mountChild } from '@/runtime-core/index.ts'
import { getFirstHostNode, getLastHostNode } from '@/runtime-core/patch/utils.ts'
import { nextTick, ref } from '@/index.ts'
import type { SetupComponent } from '@/index.ts'

describe('runtime-core component render effect: 更新锚点来源', () => {
  it('组件作为 Fragment 最后一个 child 时，rerender 新增节点应插入到父 Fragment 的 endAnchor 之前', async () => {
    const host = createHostRenderer()
    const expanded = ref(false)

    const Toggle: SetupComponent = () => {
      return () => {
        return expanded.value ? [<span>one</span>, <span>two</span>] : <span>one</span>
      }
    }

    const fragment = normalize([<div>head</div>, <Toggle />])
    const tail = normalize(<div>tail</div>)

    mountChild(host.options, fragment, { container: host.container })
    mountChild(host.options, tail, { container: host.container })

    const fragmentEnd = getLastHostNode<TestNode>(fragment)!
    const tailNode = getFirstHostNode<TestNode>(tail)!

    expect(host.container.children.at(-1)).toBe(tailNode)
    expect(host.container.children.at(-2)).toBe(fragmentEnd)

    expanded.value = true
    await nextTick()

    expect(host.container.children.at(-1)).toBe(tailNode)
    expect(host.container.children.at(-2)).toBe(fragmentEnd)

    const spanTexts = host.container.children
      .filter((node) => {
        return node.kind === 'element' && node.tag === 'span'
      })
      .map((node) => {
        return node.children[0]?.text ?? ''
      })

    expect(spanTexts).toEqual(['one', 'two'])
  })
})

