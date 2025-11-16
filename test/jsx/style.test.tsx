import { describe, expect, it } from 'vitest'
import { render } from '@/index.ts'

describe('jsx style props', () => {
  it('字符串 style 可以直接写入', () => {
    const container = document.createElement('div')
    render(<div style="color: blue;">text</div>, container)

    const el = container.querySelector('div')
    expect(el?.getAttribute('style')).toContain('color: blue')
  })

  it('对象 style 支持 camelCase 键名', () => {
    const container = document.createElement('div')
    render(<div style={{ backgroundColor: 'red' }}>text</div>, container)

    const el = container.querySelector('div') as HTMLDivElement | null
    expect(el?.style.backgroundColor).toBe('red')
  })

  it('对象 style 支持 CSS 变量兜底', () => {
    const container = document.createElement('div')
    render(<div style={{ '--main-color': 'pink' }}>text</div>, container)

    const el = container.querySelector('div') as HTMLDivElement | null
    expect(el?.style.getPropertyValue('--main-color')).toBe('pink')
  })
})
