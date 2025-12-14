import { describe, expect, it } from 'vitest'
import { domRendererOptions } from '@/runtime-dom/renderer-options.ts'

describe('runtime-dom insertBefore 宿主实现', () => {
  it('anchor 为 null 时退化为 append 到父节点末尾', () => {
    const parent = document.createElement('div')
    const first = document.createElement('span')
    const child = document.createElement('p')

    parent.append(first)

    domRendererOptions.insertBefore(parent, child, null)

    expect([...parent.childNodes]).toEqual([first, child])
  })

  it('anchor 非 parent 子节点时抛出 NotFoundError', () => {
    const parent = document.createElement('div')
    const other = document.createElement('div')
    const anchor = document.createElement('span')
    const child = document.createElement('p')

    other.append(anchor)

    expect(() => {
      domRendererOptions.insertBefore(parent, child, anchor)
    }).toThrowError(DOMException)
    expect(parent.contains(child)).toBe(false)
    expect(other.firstChild).toBe(anchor)
  })
})
