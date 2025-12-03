import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '../setup.ts'
import type { SetupFunctionComponent } from '@/index.ts'
import { reactive, render, watch } from '@/index.ts'

describe('runtime-dom component reactivity', () => {
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
})
