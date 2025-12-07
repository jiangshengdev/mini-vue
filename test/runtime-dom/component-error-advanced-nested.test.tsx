import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../setup.ts'
import type { RuntimeErrorHandler, SetupFunctionComponent } from '@/index.ts'
import { reactive, render, setRuntimeErrorHandler } from '@/index.ts'
import { runtimeErrorContexts } from '@/shared/index.ts'

describe('runtime-dom component error isolation (nested)', () => {
  afterEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  it('嵌套子组件 setup 抛错不影响同级节点', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('nested setup failed')

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      throw boom
    }

    const Parent: SetupFunctionComponent = () => {
      return () => {
        return (
          <>
            <Faulty />
            <div data-testid="sibling">stay</div>
          </>
        )
      }
    }

    render(<Parent />, container)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.componentSetup)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('stay')
  })

  it('嵌套子组件更新抛错仅卸载自身', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('nested update failed')
    const state = reactive({ count: 0 })

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      return () => {
        void state.count

        if (state.count > 0) {
          throw boom
        }

        return <div data-testid="faulty">fine</div>
      }
    }

    const Parent: SetupFunctionComponent = () => {
      return () => {
        return (
          <>
            <Faulty />
            <div data-testid="sibling">stay</div>
          </>
        )
      }
    }

    render(<Parent />, container)

    expect(container.querySelector('[data-testid="faulty"]')?.textContent).toBe('fine')
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('stay')
    expect(handler).not.toHaveBeenCalled()

    state.count += 1

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectRunner)
    expect(container.querySelector('[data-testid="faulty"]')).toBeNull()
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('stay')
  })

  it('数组 children 中某项 setup 抛错不影响其他项', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('list setup failed')

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      throw boom
    }

    const Ok: SetupFunctionComponent = () => {
      return () => {
        return <div data-testid="ok">ok</div>
      }
    }

    render(<>{[<Faulty key="bad" />, <Ok key="ok" />]}</>, container)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.componentSetup)
    expect(container.querySelector('[data-testid="ok"]')?.textContent).toBe('ok')
  })

  it('数组 children 更新抛错仅移除对应项', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('list update failed')
    const state = reactive({ count: 0 })

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      return () => {
        void state.count

        if (state.count > 0) {
          throw boom
        }

        return <div data-testid="faulty">fine</div>
      }
    }

    const Ok: SetupFunctionComponent = () => {
      return () => {
        return <div data-testid="ok">ok</div>
      }
    }

    render(<>{[<Faulty key="bad" />, <Ok key="ok" />]}</>, container)

    expect(container.querySelector('[data-testid="faulty"]')?.textContent).toBe('fine')

    expect(container.querySelector('[data-testid="ok"]')?.textContent).toBe('ok')
    expect(handler).not.toHaveBeenCalled()

    state.count += 1

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectRunner)
    expect(container.querySelector('[data-testid="faulty"]')).toBeNull()
    expect(container.querySelector('[data-testid="ok"]')?.textContent).toBe('ok')
  })
})
