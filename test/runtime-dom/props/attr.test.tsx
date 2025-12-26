import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer, renderIntoNewContainer } from '$/index.ts'
import { render } from '@/index.ts'
import { runtimeDomUnsupportedAttrValue } from '@/messages/index.ts'

describe('runtime-dom attrs props', () => {
  it('布尔与普通属性会按语义写入', () => {
    const container = renderIntoNewContainer(
      <input id="username" type="checkbox" disabled aria-label="user" />,
    )

    const input = within(container).getByRole('checkbox')

    expect(input.getAttribute('id')).toBe('username')
    expect(input.getAttribute('type')).toBe('checkbox')
    expect(input).toHaveAttribute('disabled', '')
    expect(input).toHaveAttribute('aria-label', 'user')
  })

  it('假值属性不会出现在 DOM 上', () => {
    const container = renderIntoNewContainer(
      <input disabled={false} title={undefined} data-flag={undefined} />,
    )

    const input = container.firstElementChild as HTMLInputElement

    expect(input.hasAttribute('disabled')).toBe(false)
    expect(input.hasAttribute('title')).toBe(false)
    expect(Object.hasOwn(input.dataset, 'flag')).toBe(false)
  })

  it('不支持的属性值会被忽略，并在开发期给出警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined
    })
    const payload = { nested: true }

    const container = renderIntoNewContainer(<div title={payload as unknown as string} />)

    const element = container.firstElementChild as HTMLDivElement

    expect(element.hasAttribute('title')).toBe(false)
    expect(warn).toHaveBeenCalledWith(runtimeDomUnsupportedAttrValue('title', 'object'), {
      element,
      value: payload,
    })

    warn.mockRestore()
  })

  it('空值 style 会移除 style 属性', () => {
    const container = renderIntoNewContainer(<div style={undefined}>text</div>)
    const first = within(container).getByText('text')

    expect(first.hasAttribute('style')).toBe(false)

    render(<div style={false}>text</div>, container)
    const second = within(container).getByText('text')

    expect(second.hasAttribute('style')).toBe(false)
  })

  it('相同 attr 更新不会重复写入 DOM', () => {
    const container = createTestContainer()

    render(<div id="keep">text</div>, container)

    const element = within(container).getByText('text')
    const setSpy = vi.spyOn(element, 'setAttribute')
    const removeSpy = vi.spyOn(element, 'removeAttribute')

    render(<div id="keep">text</div>, container)

    expect(setSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()

    setSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
