import { describe, expect, it, vi } from 'vitest'
import { render } from '@/jsx/renderer/index.ts'
import { Fragment } from '@/jsx-runtime'

function Button(props: { label: string; onClick: () => void }) {
  return (
    <button class="btn" onClick={props.onClick}>
      {props.label}
    </button>
  )
}

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
    render(<Button label="click" onClick={handleClick} />, container)

    container.querySelector('button')!.dispatchEvent(new MouseEvent('click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('支持 Fragment 与嵌套组件', () => {
    function Wrapper(props: { title: string; children?: unknown }) {
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
