import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '../../setup.ts'
import { render } from '@/index.ts'
import { runtimeDomInvalidStyleValue } from '@/messages/index.ts'

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

    expect(element).toHaveAttribute('style', expect.stringContaining('background-color: red'))
  })

  it('对象 style 支持 CSS 变量兜底', () => {
    const container = createTestContainer()

    render(<div style={{ '--main-color': 'pink' }}>text</div>, container)

    const element = within(container).getByText('text')

    expect(element).toHaveStyle('--main-color: pink')
  })

  it('对象 style 忽略非字符串/数字值并在开发期警告', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined
    })
    const container = createTestContainer()
    const payload: unknown = { x: 1 }

    try {
      render(<div style={{ color: payload as string }}>text</div>, container)

      const element = within(container).getByText('text')

      expect(element.getAttribute('style')).toBeNull()
      expect(element.style.color).toBe('')
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(runtimeDomInvalidStyleValue, 'color', payload)
    } finally {
      warnSpy.mockRestore()
    }
  })
})
