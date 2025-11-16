import { describe, expect, it, vi } from 'vitest'
import { Fragment } from '@/jsx-runtime'
import type { ComponentType } from '@/index.ts'
import { render } from '@/index.ts'

describe('jsx basic rendering', () => {
  it('渲染基本元素与文本', () => {
    const container = document.createElement('div')
    render(
      <div class="card">
        <span>hello</span>
      </div>,
      container,
    )
    expect(container.innerHTML).toBe(
      '<div class="card"><span>hello</span></div>',
    )
  })

  it('绑定事件并响应', () => {
    const container = document.createElement('div')
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

    container.querySelector('button')!.dispatchEvent(new MouseEvent('click'))
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

    const container = document.createElement('div')
    render(
      <Wrapper title="Hi">
        <Fragment>
          <p>first</p>
          <p>second</p>
        </Fragment>
      </Wrapper>,
      container,
    )

    expect(container.querySelectorAll('p')).toHaveLength(2)
    expect(container.querySelector('h1')?.textContent).toBe('Hi')
  })
})
