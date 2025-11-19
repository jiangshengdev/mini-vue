import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { Fragment } from '@/jsx-runtime.ts'
import type { ComponentType } from '@/index.ts'
import { render } from '@/index.ts'
import { createTestContainer } from '../setup.ts'

describe('runtime-dom basic rendering', () => {
  it('渲染基本元素与文本', () => {
    const container = createTestContainer()

    render(
      <div class="card">
        <span>hello</span>
      </div>,
      container,
    )

    const card = within(container).getByText('hello')

    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('hello')
  })

  it('绑定事件并响应', async () => {
    const container = createTestContainer()
    const handleClick = vi.fn()

    interface ButtonProps {
      label: string
      onClick: () => void
    }

    const Button: ComponentType<ButtonProps> = (props) => {
      return (
        <button class="btn" onClick={props.onClick}>
          {props.label}
        </button>
      )
    }

    render(<Button label="click" onClick={handleClick} />, container)

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

    const Wrapper: ComponentType<WrapperProps> = (props) => {
      return (
        <section>
          <h1>{props.title}</h1>
          {props.children}
        </section>
      )
    }

    const container = createTestContainer()

    render(
      <Wrapper title="Hi">
        <Fragment>
          <p>first</p>
          <p>second</p>
        </Fragment>
      </Wrapper>,
      container,
    )

    const view = within(container)

    expect(view.getByRole('heading', { name: 'Hi' })).toBeInTheDocument()
    expect(view.getByText('first')).toBeInTheDocument()
    expect(view.getByText('second')).toBeInTheDocument()
  })
})
