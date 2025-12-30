import { afterEach, describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '$/index.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import {
  createWatch,
  nextTick,
  onScopeDispose,
  reactive,
  render,
  setErrorHandler,
} from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('runtime-dom component reactivity', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('规范化 children 时应克隆 props 以避免污染外部引用', () => {
    const rawProps = { note: 'outer' }
    let receivedProps: unknown

    const Capture: SetupComponent = (props) => {
      receivedProps = props

      return () => {
        return <div class={props.note}>{props.children}</div>
      }
    }

    const container = createTestContainer()

    render(
      <Capture {...rawProps}>
        <span>first</span>
        <span>second</span>
      </Capture>,
      container,
    )

    expect(receivedProps).not.toBe(rawProps)
    expect(receivedProps).toMatchObject({ note: 'outer' })
    const propsSnapshot = receivedProps as { children?: unknown }
    const { children } = propsSnapshot

    if (!Array.isArray(children)) {
      throw new TypeError('children should be normalized to array')
    }

    expect(children).toHaveLength(2)
    expect(within(container).getByText('first')).toBeInTheDocument()
    expect(within(container).getByText('second')).toBeInTheDocument()
  })

  it('组件体读取 reactive 数据时会自动重渲染', async () => {
    let capturedState: { count: number } | undefined

    const Counter: SetupComponent = () => {
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
    await nextTick()
    expect(view.getByText('count: 1')).toBeInTheDocument()

    capturedState!.count = 2
    await nextTick()
    expect(view.getByText('count: 2')).toBeInTheDocument()
  })

  it('容器卸载后会停止组件渲染 effect', async () => {
    const renderSpy = vi.fn()
    let capturedState: { on: boolean } | undefined

    const Toggle: SetupComponent = () => {
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
    await nextTick()
    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(view.getByText('ON')).toBeInTheDocument()

    render(undefined, container)
    expect(container).toBeEmptyDOMElement()

    capturedState!.on = false
    await nextTick()
    expect(renderSpy).toHaveBeenCalledTimes(2)
  })

  it('返回空子树的组件也会在卸载时停止 effect', async () => {
    const renderSpy = vi.fn()
    let capturedState: { visible: boolean } | undefined

    const Ghost: SetupComponent = () => {
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
    await nextTick()
    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(container.textContent).toBe('ghost')

    render(undefined, container)
    expect(container).toBeEmptyDOMElement()

    capturedState!.visible = false
    await nextTick()
    expect(renderSpy).toHaveBeenCalledTimes(2)
  })

  it('Fragment 空子树组件也会在卸载时停止 effect', () => {
    const container = createTestContainer()
    const state = reactive({ count: 0 })
    const renderSpy = vi.fn()

    const Ghost: SetupComponent = () => {
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
    expect(container.children).toHaveLength(0)
    expect(container).toHaveTextContent('')

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

    const Tracker: SetupComponent = () => {
      createWatch(
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

  it('组件卸载时 scope cleanup 抛错不会阻塞后续清理', () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()
    const cleanupOrder: string[] = []

    setErrorHandler(handler)

    const WithCleanup: SetupComponent = () => {
      onScopeDispose(() => {
        cleanupOrder.push('first')
        throw new Error('component cleanup failed')
      })

      onScopeDispose(() => {
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

    expect(error.message).toBe('component cleanup failed')
    expect(context).toBe(errorContexts.effectScopeCleanup)
  })
})
