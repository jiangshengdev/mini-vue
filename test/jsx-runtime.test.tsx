import { describe, expect, it, vi } from 'vitest'
import { Fragment } from '@/jsx-runtime'
import { type ComponentType, render } from '@/index.ts'

describe('jsx runtime', () => {
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

  it('布尔子节点在 false 时不会渲染文本', () => {
    interface FlagProps {
      flag: boolean
    }

    const FlagView: ComponentType<FlagProps> = (props) => {
      return <div>{props.flag && <span>ok</span>}</div>
    }

    const container = document.createElement('div')

    render(<FlagView flag={false} />, container)
    expect(container.innerHTML).toBe('<div></div>')

    render(<FlagView flag />, container)
    expect(container.innerHTML).toBe('<div><span>ok</span></div>')
  })

  it('布尔 true 作为子节点时忽略渲染', () => {
    const container = document.createElement('div')

    render(
      <div>
        {true}
        <span>keep</span>
      </div>,
      container,
    )

    expect(container.innerHTML).toBe('<div><span>keep</span></div>')
  })

  it('数组 children 中的布尔值会被移除', () => {
    const container = document.createElement('div')

    render(
      <div>
        {[false, <span key="1">first</span>, true, <span key="2">second</span>]}
      </div>,
      container,
    )

    expect(container.innerHTML).toBe(
      '<div><span>first</span><span>second</span></div>',
    )
  })

  it('直接 render(false, container) 不应生成文本 false', () => {
    const container = document.createElement('div')

    render(false, container)

    expect(container.innerHTML).toBe('')
  })
})
