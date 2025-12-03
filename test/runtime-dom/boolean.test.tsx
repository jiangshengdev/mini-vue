import { describe, expect, it } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '../setup.ts'
import type { SetupFunctionComponent } from '@/index.ts'
import { render } from '@/index.ts'

describe('runtime-dom boolean children', () => {
  it('布尔子节点在 false 时不会渲染文本', () => {
    interface FlagProps {
      flag: boolean
    }

    const FlagView: SetupFunctionComponent<FlagProps> = (props) => {
      return () => {
        return <div>{props.flag && <span>ok</span>}</div>
      }
    }

    const container = createTestContainer()

    render(<FlagView flag={false} />, container)
    const view = within(container)

    expect(view.queryByText('ok')).toBeNull()
    expect(container.firstElementChild).toBeEmptyDOMElement()

    render(<FlagView flag />, container)
    expect(view.getByText('ok')).toHaveTextContent('ok')
  })

  it('布尔 true 作为子节点时忽略渲染', () => {
    const container = createTestContainer()

    render(
      <div>
        {true}
        <span>keep</span>
      </div>,
      container,
    )

    const view = within(container)

    expect(view.getByText('keep')).toBeDefined()
    expect(view.queryByText('true')).toBeNull()
  })

  it('数组 children 中的布尔值会被移除', () => {
    const container = createTestContainer()

    render(
      <div>{[false, <span key="1">first</span>, true, <span key="2">second</span>]}</div>,
      container,
    )

    const view = within(container)

    expect(view.getByText('first')).toHaveTextContent('first')
    expect(view.getByText('second')).toHaveTextContent('second')
    expect(view.queryByText('true')).toBeNull()
    expect(view.queryByText('false')).toBeNull()
  })

  it('直接 render(false, container) 不应生成文本 false', () => {
    const container = createTestContainer()

    render(false, container)

    expect(container).toBeEmptyDOMElement()
  })
})
