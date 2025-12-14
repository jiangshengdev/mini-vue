import { describe, expect, it } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '../../setup.ts'
import { render } from '@/index.ts'

describe('runtime-dom attrs props', () => {
  it('布尔与普通属性会按语义写入', () => {
    const container = createTestContainer()

    render(<input id="username" type="checkbox" disabled aria-label="user" />, container)

    const input = within(container).getByRole('checkbox')

    expect(input.getAttribute('id')).toBe('username')
    expect(input.getAttribute('type')).toBe('checkbox')
    expect(input).toHaveAttribute('disabled', '')
    expect(input).toHaveAttribute('aria-label', 'user')
  })

  it('假值属性不会出现在 DOM 上', () => {
    const container = createTestContainer()

    render(<input disabled={false} title={null} data-flag={undefined} />, container)

    const input = container.firstElementChild as HTMLInputElement

    expect(input.hasAttribute('disabled')).toBe(false)
    expect(input.hasAttribute('title')).toBe(false)
    expect(input.hasAttribute('data-flag')).toBe(false)
  })

  it('空值 style 会移除 style 属性', () => {
    const container = createTestContainer()

    render(<div style={null}>text</div>, container)
    const first = within(container).getByText('text')

    expect(first.hasAttribute('style')).toBe(false)

    render(<div style={false}>text</div>, container)
    const second = within(container).getByText('text')

    expect(second.hasAttribute('style')).toBe(false)
  })
})
