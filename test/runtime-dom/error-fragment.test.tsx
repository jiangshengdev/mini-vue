import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../setup.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import { reactive, render, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('runtime-dom component error isolation (fragment)', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('片段中首个组件 setup 失败会清理锚点且不挡住后续节点', () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('fragment setup failed')

    setErrorHandler(handler)

    const Faulty: SetupComponent = () => {
      throw boom
    }

    render(
      <>
        <Faulty />
        <div data-testid="sibling">ok</div>
      </>,
      container,
    )

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.componentSetup)
    expect(container.children.length).toBe(1)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
  })

  it('有故障的子组件移除后兄弟仍可响应更新', () => {
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

    expect(container.querySelector('[data-testid="faulty"]')?.textContent).toBe('a:0')
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('b:0')

    state.a += 1

    expect(handler).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="faulty"]')).toBeNull()
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('b:0')

    state.b += 1

    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('b:1')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('Fragment 内子组件渲染失败不会误移除兄弟', () => {
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

    expect(container.querySelector('[data-testid="faulty"]')?.textContent).toBe('a:0')
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('b:0')

    state.a += 1

    expect(handler).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="faulty"]')).toBeNull()
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('b:0')

    state.b += 1

    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('b:1')
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
