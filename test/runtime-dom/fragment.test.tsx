import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../setup.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import { reactive, render, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('runtime-dom fragment boundary', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('隐藏片段不会误移除外部兄弟', () => {
    const container = createTestContainer()
    const state = reactive({ show: true })

    const Parent: SetupComponent = () => {
      return () => {
        return (
          <>
            {state.show ? [<span data-testid="a">a</span>, <span data-testid="b">b</span>] : null}
            <div data-testid="tail">tail</div>
          </>
        )
      }
    }

    render(<Parent />, container)

    expect(container.querySelector('[data-testid="a"]')?.textContent).toBe('a')
    expect(container.querySelector('[data-testid="b"]')?.textContent).toBe('b')
    expect(container.querySelector('[data-testid="tail"]')?.textContent).toBe('tail')

    state.show = false

    expect(container.querySelector('[data-testid="a"]')).toBeNull()
    expect(container.querySelector('[data-testid="b"]')).toBeNull()
    expect(container.querySelector('[data-testid="tail"]')?.textContent).toBe('tail')
  })

  it('片段子组件故障清理后外部兄弟仍可更新', () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('fragment child failed')
    const state = reactive({ fail: false, stable: 0, tail: 0 })

    setErrorHandler(handler)

    const Faulty: SetupComponent = () => {
      return () => {
        void state.fail

        if (state.fail) {
          throw boom
        }

        return <div data-testid="faulty">ok</div>
      }
    }

    const Parent: SetupComponent = () => {
      return () => {
        return (
          <>
            {[
              <Faulty key="bad" />,
              <div key="stable" data-testid="stable">
                stable:{state.stable}
              </div>,
            ]}
            <div data-testid="tail">tail:{state.tail}</div>
          </>
        )
      }
    }

    render(<Parent />, container)

    expect(handler).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="faulty"]')?.textContent).toBe('ok')
    expect(container.querySelector('[data-testid="stable"]')?.textContent).toBe('stable:0')
    expect(container.querySelector('[data-testid="tail"]')?.textContent).toBe('tail:0')

    state.fail = true

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.effectRunner)
    expect(container.querySelector('[data-testid="faulty"]')).toBeNull()
    expect(container.querySelector('[data-testid="stable"]')?.textContent).toBe('stable:0')
    expect(container.querySelector('[data-testid="tail"]')?.textContent).toBe('tail:0')

    state.stable += 1
    state.tail += 1

    expect(container.querySelector('[data-testid="stable"]')?.textContent).toBe('stable:1')
    expect(container.querySelector('[data-testid="tail"]')?.textContent).toBe('tail:1')
  })
})
