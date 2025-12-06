import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../setup.ts'
import type { RuntimeErrorHandler, SetupFunctionComponent } from '@/index.ts'
import { reactive, render, setRuntimeErrorHandler } from '@/index.ts'
import { runtimeErrorContexts } from '@/shared/runtime-error-channel.ts'

describe('runtime-dom component error isolation (advanced)', () => {
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

  it('片段中首个组件 setup 失败会清理锚点且不挡住后续节点', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('fragment setup failed')

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
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
    expect(context).toBe(runtimeErrorContexts.componentSetup)
    expect(container.children.length).toBe(1)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
  })

  it('有故障的子组件移除后兄弟仍可响应更新', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('rerender failed')
    const state = reactive({ a: 0, b: 0 })

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      return () => {
        void state.a

        if (state.a > 0) {
          throw boom
        }

        return <div data-testid="faulty">a:{state.a}</div>
      }
    }

    const Sibling: SetupFunctionComponent = () => {
      return () => {
        void state.b

        return <div data-testid="sibling">b:{state.b}</div>
      }
    }

    const Parent: SetupFunctionComponent = () => {
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
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('fragment rerender failed')
    const state = reactive({ a: 0, b: 0 })

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      return () => {
        void state.a

        if (state.a > 0) {
          throw boom
        }

        return <div data-testid="faulty">a:{state.a}</div>
      }
    }

    const Sibling: SetupFunctionComponent = () => {
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
