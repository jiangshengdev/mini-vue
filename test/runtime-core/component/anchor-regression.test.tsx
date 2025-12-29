import { describe, expect, it } from 'vitest'
import type { TestNode } from '../host-utils.ts'
import { createHostRenderer, normalize } from '../host-utils.ts'
import {
  asRuntimeVirtualNode,
  mountChild,
  patchChild,
  patchChildren,
} from '@/runtime-core/index.ts'
import type { SetupComponent } from '@/index.ts'
import { nextTick, ref } from '@/index.ts'

function collectElementTexts(children: TestNode[]): string[] {
  return children
    .filter((node) => {
      return node.kind === 'element'
    })
    .map((node) => {
      const text = node.children.find((child) => {
        return child.kind === 'text'
      })

      return text?.text ?? ''
    })
}

describe('组件锚点回退', () => {
  it('render 为空后重排再显示仍按锚点位置插入', async () => {
    const host = createHostRenderer()
    const createToggleComponent = (label: string) => {
      const visible = ref(true)

      const Component = () => {
        return () => {
          return visible.value ? <span>{label}</span> : undefined
        }
      }

      return {
        Component,
        show() {
          visible.value = true
        },
        hide() {
          visible.value = false
        },
      }
    }

    const componentA = createToggleComponent('A')
    const componentB = createToggleComponent('B')
    const previousChildren = [
      normalize(<componentA.Component key="a" />),
      normalize(<componentB.Component key="b" />),
      normalize(<div key="tail">tail</div>),
    ]

    for (const [index, child] of previousChildren.entries()) {
      mountChild(host.options, child, {
        container: host.container,
        context: { shouldUseAnchor: index < previousChildren.length - 1 },
      })
    }

    componentA.hide()

    await nextTick()

    const nextChildren = [
      normalize(<componentB.Component key="b" />),
      normalize(<componentA.Component key="a" />),
      normalize(<div key="tail">tail</div>),
    ]

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    const runtimeA = asRuntimeVirtualNode(nextChildren[1])
    const runtimeTail = asRuntimeVirtualNode(nextChildren[2])

    expect(runtimeA.component?.endAnchor).toBeDefined()
    expect(runtimeTail.el).toBeDefined()
    expect(host.container.children.indexOf(runtimeA.component?.endAnchor as TestNode)).toBeLessThan(
      host.container.children.indexOf(runtimeTail.el as TestNode),
    )

    expect(collectElementTexts(host.container.children)).toEqual(['B', 'tail'])

    componentA.show()

    await nextTick()

    expect(collectElementTexts(host.container.children)).toEqual(['B', 'A', 'tail'])
  })

  it('render 为空的组件在移动时不应复活旧子节点', async () => {
    const host = createHostRenderer()
    const createToggleComponent = (label: string) => {
      const visible = ref(true)

      const Component = () => {
        return () => {
          return visible.value ? <span>{label}</span> : undefined
        }
      }

      return {
        Component,
        show() {
          visible.value = true
        },
        hide() {
          visible.value = false
        },
      }
    }

    const componentA = createToggleComponent('A')
    const componentB = createToggleComponent('B')
    const componentC = createToggleComponent('C')
    const previousChildren = [
      normalize(<componentA.Component key="a" />),
      normalize(<componentB.Component key="b" />),
      normalize(<componentC.Component key="c" />),
    ]

    for (const [index, child] of previousChildren.entries()) {
      mountChild(host.options, child, {
        container: host.container,
        context: { shouldUseAnchor: index < previousChildren.length - 1 },
      })
    }

    componentA.hide()

    await nextTick()

    const nextChildren = [
      normalize(<componentB.Component key="b" />),
      normalize(<componentC.Component key="c" />),
      normalize(<componentA.Component key="a" />),
    ]

    patchChildren(host.options, previousChildren, nextChildren, {
      container: host.container,
      patchChild,
    })

    expect(collectElementTexts(host.container.children)).toEqual(['B', 'C'])

    componentA.show()

    await nextTick()

    expect(collectElementTexts(host.container.children)).toEqual(['B', 'C', 'A'])
  })

  it('全部隐藏后打乱顺序再显示，左右视图仍一致', async () => {
    const host = createHostRenderer()
    const ToggleComponent: SetupComponent<{ label: string; show: boolean }> = (props) => {
      return () => {
        return props.show ? <span>{props.label}</span> : undefined
      }
    }

    let previousChildren = [
      normalize(<ToggleComponent key="a" label="A" show />),
      normalize(<ToggleComponent key="b" label="B" show />),
      normalize(<ToggleComponent key="c" label="C" show />),
    ]

    for (const [index, child] of previousChildren.entries()) {
      mountChild(host.options, child, {
        container: host.container,
        context: { shouldUseAnchor: index < previousChildren.length - 1 },
      })
    }

    const hiddenChildren = [
      normalize(<ToggleComponent key="c" label="C" show={false} />),
      normalize(<ToggleComponent key="a" label="A" show={false} />),
      normalize(<ToggleComponent key="b" label="B" show={false} />),
    ]

    patchChildren(host.options, previousChildren, hiddenChildren, {
      container: host.container,
      patchChild,
    })

    previousChildren = hiddenChildren

    const shownChildren = [
      normalize(<ToggleComponent key="c" label="C" show />),
      normalize(<ToggleComponent key="a" label="A" show />),
      normalize(<ToggleComponent key="b" label="B" show />),
    ]

    patchChildren(host.options, previousChildren, shownChildren, {
      container: host.container,
      patchChild,
    })

    const order = collectElementTexts(host.container.children)

    expect(order.filter(Boolean)).toEqual(['C', 'A', 'B'])
  })
})
