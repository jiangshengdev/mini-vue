import { afterEach, describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { Fragment, nextTick, reactive, render } from '@/index.ts'
import { Text } from '@/jsx-foundation/index.ts'

function installFakeDevtoolsHook() {
  const emit = vi.fn()

  ;(
    globalThis as unknown as { __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown }
  ).__VUE_DEVTOOLS_GLOBAL_HOOK__ = { emit }

  return emit
}

function uninstallFakeDevtoolsHook() {
  delete (globalThis as unknown as { __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown })
    .__VUE_DEVTOOLS_GLOBAL_HOOK__
  delete (globalThis as unknown as { __VUE__?: unknown }).__VUE__
}

describe('runtime-dom devtools component picker markers', () => {
  afterEach(() => {
    uninstallFakeDevtoolsHook()
  })

  it('启用 Devtools hook 时应写入 __vueParentComponent/__vnode', () => {
    installFakeDevtoolsHook()

    const Child: SetupComponent = () => {
      return () => {
        return <span data-testid="child">child</span>
      }
    }

    const Parent: SetupComponent = () => {
      return () => {
        return (
          <div data-testid="parent">
            <Child />
          </div>
        )
      }
    }

    const container = createTestContainer()

    render(<Parent />, container)

    const view = within(container)
    const parentElement = view.getByTestId('parent')
    const childElement = view.getByTestId('child')

    const parentInstance = (parentElement as unknown as { __vueParentComponent?: unknown })
      .__vueParentComponent as { type?: unknown } | undefined

    expect(parentInstance).toBeTruthy()
    expect(parentInstance?.type).toBe(Parent)

    const childInstance = (childElement as unknown as { __vueParentComponent?: unknown })
      .__vueParentComponent as { type?: unknown } | undefined

    expect(childInstance).toBeTruthy()
    expect(childInstance?.type).toBe(Child)

    expect((childElement as unknown as { __vnode?: unknown }).__vnode).toBeTruthy()
    expect((childElement as unknown as { __vnode?: { type?: unknown } }).__vnode?.type).toBe('span')

    const textNode = childElement.firstChild

    expect(textNode).toBeTruthy()
    expect((textNode as unknown as { __vueParentComponent?: unknown }).__vueParentComponent).toBe(
      childInstance,
    )
    expect((textNode as unknown as { __vnode?: unknown }).__vnode).toBeTruthy()
    expect((textNode as unknown as { __vnode?: { type?: unknown } }).__vnode?.type).toBe(Text)
  })

  it('patch 复用宿主节点时应更新 __vnode', async () => {
    installFakeDevtoolsHook()

    let state: { count: number } | undefined

    const Counter: SetupComponent = () => {
      const data = reactive({ count: 0 })

      state = data

      return () => {
        return <div data-testid="counter">{data.count}</div>
      }
    }

    const container = createTestContainer()

    render(<Counter />, container)

    const view = within(container)
    const element = view.getByTestId('counter')
    const firstElementVnode = (element as unknown as { __vnode?: unknown }).__vnode
    const textNode = element.firstChild
    const firstTextVnode = (textNode as unknown as { __vnode?: unknown }).__vnode

    state!.count = 1
    await nextTick()

    const nextElementVnode = (element as unknown as { __vnode?: unknown }).__vnode
    const nextTextNode = element.firstChild
    const nextTextVnode = (nextTextNode as unknown as { __vnode?: unknown }).__vnode

    expect(nextElementVnode).not.toBe(firstElementVnode)
    expect(nextTextNode).toBe(textNode)
    expect(nextTextVnode).not.toBe(firstTextVnode)
    expect((nextTextVnode as { text?: unknown }).text).toBe('1')
  })

  it('Fragment 边界注释应写入并在 patch 时更新 __vnode', async () => {
    installFakeDevtoolsHook()

    let state: { on: boolean } | undefined

    const App: SetupComponent = () => {
      const data = reactive({ on: true })

      state = data

      return () => {
        return (
          <>
            <span data-testid="a">{data.on ? 'a' : 'aa'}</span>
            <span data-testid="b">b</span>
          </>
        )
      }
    }

    const container = createTestContainer()

    render(<App />, container)

    const commentNodes = [...container.childNodes].filter((node) => {
      return node.nodeType === 8
    }) as Comment[]
    const startAnchor = commentNodes.find((node) => {
      return node.nodeValue === 'fragment-start'
    })
    const endAnchor = commentNodes.find((node) => {
      return node.nodeValue === 'fragment-end'
    })

    expect(startAnchor).toBeTruthy()
    expect(endAnchor).toBeTruthy()

    const startInstance = (startAnchor as unknown as { __vueParentComponent?: unknown })
      .__vueParentComponent as { type?: unknown } | undefined

    expect(startInstance).toBeTruthy()
    expect(startInstance?.type).toBe(App)
    expect((startAnchor as unknown as { __vnode?: unknown }).__vnode).toBeTruthy()
    expect((startAnchor as unknown as { __vnode?: { type?: unknown } }).__vnode?.type).toBe(
      Fragment,
    )

    const firstFragmentVnode = (startAnchor as unknown as { __vnode?: unknown }).__vnode

    state!.on = false
    await nextTick()

    const nextFragmentVnode = (startAnchor as unknown as { __vnode?: unknown }).__vnode

    expect(nextFragmentVnode).not.toBe(firstFragmentVnode)
  })
})
