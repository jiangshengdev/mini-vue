import { describe, expect, it } from 'vitest'
import type { ComponentType } from '@/index.ts'
import { render } from '@/index.ts'

describe('jsx boolean children', () => {
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
