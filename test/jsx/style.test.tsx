import { describe, expect, it } from 'vitest'
import { within } from '@testing-library/dom'
import { render } from '@/index.ts'

describe('jsx style props', () => {
  it('字符串 style 可以直接写入', () => {
    const container = document.createElement('div')
    render(<div style="color: blue;">text</div>, container)

    const el = within(container).getByText('text')
    expect(el).toHaveAttribute('style', expect.stringContaining('color: blue'))
  })

  it('对象 style 支持 camelCase 键名', () => {
    const container = document.createElement('div')
    render(<div style={{ backgroundColor: 'red' }}>text</div>, container)

    const el = within(container).getByText('text')
    expect(el).toHaveAttribute(
      'style',
      expect.stringContaining('background-color: red'),
    )
  })

  it('对象 style 支持 CSS 变量兜底', () => {
    const container = document.createElement('div')
    render(<div style={{ '--main-color': 'pink' }}>text</div>, container)

    const el = within(container).getByText('text') as HTMLElement
    expect(el).toHaveStyle('--main-color: pink')
  })
})
