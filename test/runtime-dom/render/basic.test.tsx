import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { createTestContainer, renderIntoNewContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { Fragment, reactive, render } from '@/index.ts'
import { runtimeCoreObjectChildWarning } from '@/messages/index.ts'

describe('runtime-dom 基础渲染', () => {
  it('渲染基本元素与文本', () => {
    const container = renderIntoNewContainer(
      <div class="card">
        <span>hello</span>
      </div>,
    )

    const card = within(container).getByText('hello')

    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('hello')
  })

  it('绑定事件并响应', async () => {
    const handleClick = vi.fn()

    interface ButtonProps {
      label: string
      onClick: () => void
    }

    const Button: SetupComponent<ButtonProps> = (props) => {
      return () => {
        return (
          <button class="btn" onClick={props.onClick}>
            {props.label}
          </button>
        )
      }
    }

    const container = renderIntoNewContainer(<Button label="click" onClick={handleClick} />)

    const button = within(container).getByRole('button', { name: 'click' })
    const user = userEvent.setup()

    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('支持 Fragment 与嵌套组件', () => {
    interface WrapperProps {
      title: string
      children?: unknown
    }

    const Wrapper: SetupComponent<WrapperProps> = (props) => {
      return () => {
        return (
          <section>
            <h1>{props.title}</h1>
            {props.children}
          </section>
        )
      }
    }

    const container = renderIntoNewContainer(
      <Wrapper title="Hi">
        <Fragment>
          <p>first</p>
          <p>second</p>
        </Fragment>
      </Wrapper>,
    )

    const view = within(container)

    expect(view.getByRole('heading', { name: 'Hi' })).toBeInTheDocument()
    expect(view.getByText('first')).toBeInTheDocument()
    expect(view.getByText('second')).toBeInTheDocument()
  })

  it('重复 render 会清理旧树的 effect', () => {
    const renderSpy = vi.fn()
    const state = reactive({ count: 0 })
    const container = createTestContainer()

    const Counter: SetupComponent = () => {
      return () => {
        renderSpy()

        return <span data-testid="count">{state.count}</span>
      }
    }

    render(<Counter />, container)

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe('0')

    state.count = 1

    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe('1')

    render(<div data-testid="next">next</div>, container)
    state.count = 2

    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="next"]')?.textContent).toBe('next')
  })

  it('不可渲染子节点在开发期警告并忽略渲染', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined
    })
    const container = createTestContainer()

    /* 构造多种非法 child 形态，逐个喂给 render 并比对 warning 与空容器。 */
    const payloads: unknown[] = [
      { foo: 'bar' },
      () => {
        return undefined
      },
      Symbol('skip'),
    ]

    try {
      for (const payload of payloads) {
        render(payload as never, container)

        expect(container).toBeEmptyDOMElement()
      }

      expect(warnSpy).toHaveBeenCalledTimes(payloads.length)

      for (const [index, payload] of payloads.entries()) {
        expect(warnSpy.mock.calls[index]?.[0]).toBe(runtimeCoreObjectChildWarning)
        expect(warnSpy.mock.calls[index]?.[1]).toBe(payload)
      }
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('卸载元素时不会对子节点重复调用 remove', () => {
    const container = createTestContainer()
    const ElementCtor = container.ownerDocument.defaultView!.Element
    const originalRemove = ElementCtor.prototype.remove
    const removeSpy = vi.fn(function remove(this: InstanceType<typeof ElementCtor>) {
      originalRemove.call(this)
    })

    ElementCtor.prototype.remove = removeSpy

    try {
      render(
        <div data-testid="parent">
          <span data-testid="first" />
          <span data-testid="second" />
        </div>,
        container,
      )

      render(undefined, container)

      expect(removeSpy).toHaveBeenCalledTimes(1)
      const removedNode = removeSpy.mock.instances[0]

      expect(removedNode).toBeInstanceOf(Element)
      expect((removedNode as HTMLElement).dataset.testid).toBe('parent')
    } finally {
      ElementCtor.prototype.remove = originalRemove
    }
  })
})
