import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '../setup.ts'
import type { ComponentType } from '@/index.ts'
import { reactive, render } from '@/index.ts'

describe('runtime-dom component reactivity', () => {
  it('组件体读取 reactive 数据时会自动重渲染', () => {
    const state = reactive({ count: 0 })

    const Counter: ComponentType = () => {
      return <p>count: {state.count}</p>
    }

    const container = createTestContainer()

    render(<Counter />, container)

    const view = within(container)

    expect(view.getByText('count: 0')).toBeInTheDocument()

    state.count = 1
    expect(view.getByText('count: 1')).toBeInTheDocument()

    state.count = 2
    expect(view.getByText('count: 2')).toBeInTheDocument()
  })

  it('容器卸载后会停止组件渲染 effect', () => {
    const renderSpy = vi.fn()
    const state = reactive({ on: false })

    const Toggle: ComponentType = () => {
      renderSpy()

      return <div>{state.on ? 'ON' : 'OFF'}</div>
    }

    const container = createTestContainer()

    render(<Toggle />, container)

    const view = within(container)

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(view.getByText('OFF')).toBeInTheDocument()

    state.on = true
    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(view.getByText('ON')).toBeInTheDocument()

    render(undefined, container)
    expect(container).toBeEmptyDOMElement()

    state.on = false
    expect(renderSpy).toHaveBeenCalledTimes(2)
  })
})
