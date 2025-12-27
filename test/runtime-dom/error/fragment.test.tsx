import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestContainer, renderIntoNewContainer } from '$/index.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import { nextTick, reactive, render, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('runtime-dom 组件错误隔离（fragment）', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('片段中首个组件 setup 失败会清理锚点且不挡住后续节点', () => {
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('fragment setup failed')

    setErrorHandler(handler)

    const Faulty: SetupComponent = () => {
      throw boom
    }

    const container = renderIntoNewContainer(
      <>
        <Faulty />
        <div data-testid="sibling">ok</div>
      </>,
    )

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.componentSetup)
    expect(container.children.length).toBe(1)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
  })

  it('有故障的子组件保留旧视图且兄弟仍可响应更新', async () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('rerender failed')
    const state = reactive({ a: 0, b: 0 })

    setErrorHandler(handler)

    const Faulty: SetupComponent = () => {
      return () => {
        void state.a

        if (state.a > 0) {
          throw boom
        }

        return <div data-testid="faulty">a:{state.a}</div>
      }
    }

    const Sibling: SetupComponent = () => {
      return () => {
        void state.b

        return <div data-testid="sibling">b:{state.b}</div>
      }
    }

    const Parent: SetupComponent = () => {
      return () => {
        return (
          <div data-testid="root">
            <Faulty />
            <Sibling />
          </div>
        )
      }
    }

    render(<Parent />, container)

    const getFaulty = () => {
      return container.querySelector('[data-testid="faulty"]')
    }

    const getSibling = () => {
      return container.querySelector('[data-testid="sibling"]')
    }

    expect(getFaulty()?.textContent).toBe('a:0')
    expect(getSibling()?.textContent).toBe('b:0')

    state.a += 1

    await nextTick()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(getFaulty()?.textContent).toBe('a:0')
    expect(getSibling()?.textContent).toBe('b:0')

    state.b += 1

    await nextTick()

    expect(getSibling()?.textContent).toBe('b:1')
    expect(getFaulty()?.textContent).toBe('a:0')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('Fragment 内子组件渲染失败不会误移除兄弟', async () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('fragment rerender failed')
    const state = reactive({ a: 0, b: 0 })

    setErrorHandler(handler)

    const Faulty: SetupComponent = () => {
      return () => {
        void state.a

        if (state.a > 0) {
          throw boom
        }

        return <div data-testid="faulty">a:{state.a}</div>
      }
    }

    const Sibling: SetupComponent = () => {
      return () => {
        void state.b

        return <div data-testid="sibling">b:{state.b}</div>
      }
    }

    render(
      <>
        <Faulty />
        <Sibling />
      </>,
      container,
    )

    const getFaulty = () => {
      return container.querySelector('[data-testid="faulty"]')
    }

    const getSibling = () => {
      return container.querySelector('[data-testid="sibling"]')
    }

    expect(getFaulty()?.textContent).toBe('a:0')
    expect(getSibling()?.textContent).toBe('b:0')

    state.a += 1

    await nextTick()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(getFaulty()?.textContent).toBe('a:0')
    expect(getSibling()?.textContent).toBe('b:0')

    state.b += 1

    await nextTick()

    expect(getSibling()?.textContent).toBe('b:1')
    expect(getFaulty()?.textContent).toBe('a:0')
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
