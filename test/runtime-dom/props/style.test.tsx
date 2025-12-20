import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { renderIntoNewContainer } from '../../helpers.ts'
import { runtimeDomInvalidStyleValue } from '@/messages/index.ts'

describe('runtime-dom style props', () => {
  it('字符串 style 可以直接写入', () => {
    const container = renderIntoNewContainer(<div style="color: blue;">text</div>)

    const element = within(container).getByText('text')

    expect(element).toHaveAttribute('style', expect.stringContaining('color: blue'))
  })

  it('对象 style 支持 camelCase 键名', () => {
    const container = renderIntoNewContainer(<div style={{ backgroundColor: 'red' }}>text</div>)

    const element = within(container).getByText('text')

    expect(element).toHaveAttribute('style', expect.stringContaining('background-color: red'))
  })

  it('对象 style 支持 CSS 变量兜底', () => {
    const container = renderIntoNewContainer(<div style={{ '--main-color': 'pink' }}>text</div>)

    const element = within(container).getByText('text')

    expect(element).toHaveStyle('--main-color: pink')
  })

  it('对象 style 忽略非字符串/数字值并在开发期警告', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined
    })
    const payload: unknown = { x: 1 }

    try {
      const container = renderIntoNewContainer(<div style={{ color: payload as string }}>text</div>)

      const element = within(container).getByText('text')

      expect(element.getAttribute('style')).toBeNull()
      expect(element.style.color).toBe('')
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        runtimeDomInvalidStyleValue('color', typeof payload),
        payload,
      )
    } finally {
      warnSpy.mockRestore()
    }
  })
})
