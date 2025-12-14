import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '../../setup.ts'
import type { ElementRef, SetupComponent } from '@/index.ts'
import { createApp, reactive, ref, render } from '@/index.ts'

describe('runtime-dom ref 回调', () => {
  it('render 卸载时会以 undefined 调用 ref', () => {
    const container = createTestContainer()
    const refSpy = vi.fn<(element: Element | undefined) => void>()

    render(
      <button type="button" ref={refSpy}>
        click
      </button>,
      container,
    )

    const button = within(container).getByRole('button')

    expect(refSpy).toHaveBeenCalledTimes(1)
    expect(refSpy).toHaveBeenLastCalledWith(button)

    render(undefined, container)

    expect(refSpy).toHaveBeenCalledTimes(2)
    expect(refSpy).toHaveBeenLastCalledWith(undefined)
  })

  it('组件重渲染与卸载都会清理 ref', () => {
    const refSpy = vi.fn<(element: Element | undefined) => void>()
    const state = reactive({ label: 'first' })

    const CounterButton: SetupComponent = () => {
      return () => {
        return (
          <button type="button" ref={refSpy}>
            {state.label}
          </button>
        )
      }
    }

    const container = createTestContainer()
    const app = createApp(CounterButton)

    app.mount(container)

    const firstButton = within(container).getByRole('button', {
      name: 'first',
    })

    expect(refSpy).toHaveBeenCalledTimes(1)
    expect(refSpy).toHaveBeenLastCalledWith(firstButton)

    state.label = 'second'

    const secondButton = within(container).getByRole('button', {
      name: 'second',
    })

    expect(refSpy).toHaveBeenNthCalledWith(2, undefined)
    expect(refSpy).toHaveBeenNthCalledWith(3, secondButton)

    app.unmount()

    expect(refSpy).toHaveBeenNthCalledWith(4, undefined)
    expect(container).toBeEmptyDOMElement()
  })

  it('render 支持响应式 ref 并在卸载时写回 undefined', () => {
    const container = createTestContainer()
    const elementRef = ref<Element | undefined>(undefined)

    render(
      <button type="button" ref={elementRef}>
        click
      </button>,
      container,
    )

    expect(elementRef.value).toBe(within(container).getByRole('button'))

    render(undefined, container)

    expect(elementRef.value).toBeUndefined()
  })

  it('render 遇到非函数/Ref 的 ref 值时按普通属性处理', () => {
    const container = createTestContainer()

    render(
      <button type="button" ref={'plain' as unknown as ElementRef}>
        click
      </button>,
      container,
    )

    expect(within(container).getByRole('button')).toHaveAttribute('ref', 'plain')

    render(undefined, container)

    expect(container).toBeEmptyDOMElement()
  })

  it('组件重渲染与卸载同样支持响应式 ref', () => {
    const elementRef = ref<Element | undefined>(undefined)
    const state = reactive({ label: 'first' })

    const CounterButton: SetupComponent = () => {
      return () => {
        return (
          <button type="button" ref={elementRef}>
            {state.label}
          </button>
        )
      }
    }

    const container = createTestContainer()
    const app = createApp(CounterButton)

    app.mount(container)

    expect(elementRef.value).not.toBeUndefined()
    expect(elementRef.value?.textContent).toBe('first')

    state.label = 'second'

    expect(elementRef.value).not.toBeUndefined()
    expect(elementRef.value?.textContent).toBe('second')

    app.unmount()

    expect(elementRef.value).toBeUndefined()
  })
})
