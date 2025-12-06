import { afterEach, describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '../setup.ts'
import type { RuntimeErrorHandler, SetupFunctionComponent } from '@/index.ts'
import { reactive, render, setRuntimeErrorHandler, watch } from '@/index.ts'
import { getCurrentInstance } from '@/runtime-core/component-instance.ts'
import { runtimeErrorContexts } from '@/shared/runtime-error-channel.ts'

describe('runtime-dom component reactivity', () => {
  afterEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  it('组件体读取 reactive 数据时会自动重渲染', () => {
    let capturedState: { count: number } | undefined

    const Counter: SetupFunctionComponent = () => {
      const state = reactive({ count: 0 })

      capturedState = state

      return () => {
        return <p>count: {state.count}</p>
      }
    }

    const container = createTestContainer()

    render(<Counter />, container)

    const view = within(container)

    expect(view.getByText('count: 0')).toBeInTheDocument()

    capturedState!.count = 1
    expect(view.getByText('count: 1')).toBeInTheDocument()

    capturedState!.count = 2
    expect(view.getByText('count: 2')).toBeInTheDocument()
  })

  it('容器卸载后会停止组件渲染 effect', () => {
    const renderSpy = vi.fn()
    let capturedState: { on: boolean } | undefined

    const Toggle: SetupFunctionComponent = () => {
      const state = reactive({ on: false })

      capturedState = state

      return () => {
        renderSpy()

        return <div>{state.on ? 'ON' : 'OFF'}</div>
      }
    }

    const container = createTestContainer()

    render(<Toggle />, container)

    const view = within(container)

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(view.getByText('OFF')).toBeInTheDocument()

    capturedState!.on = true
    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(view.getByText('ON')).toBeInTheDocument()

    render(undefined, container)
    expect(container).toBeEmptyDOMElement()

    capturedState!.on = false
    expect(renderSpy).toHaveBeenCalledTimes(2)
  })

  it('返回空子树的组件也会在卸载时停止 effect', () => {
    const renderSpy = vi.fn()
    let capturedState: { visible: boolean } | undefined

    const Ghost: SetupFunctionComponent = () => {
      const state = reactive({ visible: false })

      capturedState = state

      return () => {
        renderSpy()

        if (!state.visible) {
          return undefined
        }

        return <span>ghost</span>
      }
    }

    const container = createTestContainer()

    render(<Ghost />, container)

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(container).toBeEmptyDOMElement()

    capturedState!.visible = true
    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(container.textContent).toBe('ghost')

    render(undefined, container)
    expect(container).toBeEmptyDOMElement()

    capturedState!.visible = false
    expect(renderSpy).toHaveBeenCalledTimes(2)
  })

  it('Fragment 空子树组件也会在卸载时停止 effect', () => {
    const container = createTestContainer()
    const state = reactive({ count: 0 })
    const renderSpy = vi.fn()

    const Ghost: SetupFunctionComponent = () => {
      return () => {
        renderSpy()

        return state.count >= 0 ? undefined : undefined
      }
    }

    render(
      <>
        <Ghost />
      </>,
      container,
    )

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(container).toBeEmptyDOMElement()

    render(<div>next</div>, container)
    expect(container.textContent).toBe('next')

    state.count = 1
    expect(renderSpy).toHaveBeenCalledTimes(1)
  })

  it('组件卸载时会清理 setup 内的 watch', () => {
    const container = createTestContainer()
    const state = reactive({ count: 0 })
    const watchSpy = vi.fn()
    const cleanupSpy = vi.fn()

    const Tracker: SetupFunctionComponent = () => {
      watch(
        () => {
          return state.count
        },
        (value, _oldValue, onCleanup) => {
          watchSpy(value)
          onCleanup(() => {
            cleanupSpy()
          })
        },
        { immediate: true },
      )

      return () => {
        return <span>{state.count}</span>
      }
    }

    render(<Tracker />, container)

    expect(watchSpy).toHaveBeenCalledTimes(1)
    expect(cleanupSpy).toHaveBeenCalledTimes(0)

    state.count = 1
    expect(watchSpy).toHaveBeenCalledTimes(2)
    expect(cleanupSpy).toHaveBeenCalledTimes(1)

    render(undefined, container)
    expect(cleanupSpy).toHaveBeenCalledTimes(2)

    state.count = 2
    expect(watchSpy).toHaveBeenCalledTimes(2)
  })

  it('组件 cleanupTasks 抛错时不会阻塞后续清理', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const cleanupOrder: string[] = []

    setRuntimeErrorHandler(handler)

    const WithCleanup: SetupFunctionComponent = () => {
      const instance = getCurrentInstance()

      instance?.cleanupTasks.push(() => {
        cleanupOrder.push('first')
        throw new Error('component cleanup failed')
      })

      instance?.cleanupTasks.push(() => {
        cleanupOrder.push('second')
      })

      return () => {
        return <span>cleanup</span>
      }
    }

    render(<WithCleanup />, container)

    expect(cleanupOrder).toEqual([])

    render(undefined, container)

    expect(cleanupOrder).toEqual(['first', 'second'])
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('component cleanup failed')
    expect(context).toBe(runtimeErrorContexts.componentCleanup)
  })

  it('setup 抛错会通知错误处理器且跳过挂载', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('setup failed')

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      throw boom
    }

    render(<Faulty />, container)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.componentSetup)
    expect(container.childNodes.length).toBe(0)
  })

  it('setup 抛错不影响兄弟挂载', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('setup failed')

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      throw boom
    }

    const Sibling: SetupFunctionComponent = () => {
      return () => {
        return <div data-testid="sibling">ok</div>
      }
    }

    render(
      <>
        <Faulty />
        <Sibling />
      </>,
      container,
    )

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.componentSetup)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
    expect(container.querySelector('[data-testid="faulty"]')).toBeNull()
  })

  it('首次渲染抛错会停止组件 effect 且不阻断兄弟渲染', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('render failed')
    const state = reactive({ count: 0 })
    const renderSpy = vi.fn()
    const Sibling: SetupFunctionComponent = () => {
      return () => {
        return <div data-testid="sibling">ok</div>
      }
    }

    setRuntimeErrorHandler(handler)

    const Faulty: SetupFunctionComponent = () => {
      return () => {
        renderSpy()
        void state.count

        throw boom
      }
    }

    render(
      <>
        <Faulty />
        <Sibling />
      </>,
      container,
    )

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectRunner)
    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')

    state.count += 1

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
  })

  it('更新阶段抛错会卸载组件且不影响兄弟', () => {
    const container = createTestContainer()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('update failed')
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

    const Sibling: SetupFunctionComponent = () => {
      return () => {
        return <div data-testid="sibling">ok</div>
      }
    }

    render(
      <>
        <Faulty />
        <Sibling />
      </>,
      container,
    )

    expect(container.querySelector('[data-testid="faulty"]')?.textContent).toBe('fine')
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
    expect(handler).not.toHaveBeenCalled()

    state.count += 1

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectRunner)
    expect(container.querySelector('[data-testid="faulty"]')).toBeNull()
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
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
})
