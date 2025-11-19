import { describe, expect, it } from 'vitest'
import { within } from '@testing-library/dom'
import { render } from '@/index.ts'
import { createTestContainer } from '../setup.ts'

describe('runtime-dom style props', () => {
  it('字符串 style 可以直接写入', () => {
    const container = createTestContainer()

    render(<div style="color: blue;">text</div>, container)

    const element = within(container).getByText('text')

    expect(element).toHaveAttribute('style', expect.stringContaining('color: blue'))
  })

  it('对象 style 支持 camelCase 键名', () => {
    const container = createTestContainer()

    render(<div style={{ backgroundColor: 'red' }}>text</div>, container)

    const element = within(container).getByText('text')

    expect(element).toHaveAttribute(
      'style',
      expect.stringContaining('background-color: red'),
    )
  })

  it('对象 style 支持 CSS 变量兜底', () => {
    const container = createTestContainer()

    render(<div style={{ '--main-color': 'pink' }}>text</div>, container)

    const element = within(container).getByText('text') as HTMLElement

    expect(element).toHaveStyle('--main-color: pink')
  })
})
