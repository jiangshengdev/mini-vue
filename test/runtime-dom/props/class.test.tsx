import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer, renderIntoNewContainer } from '$/index.ts'
import { render } from '@/index.ts'

describe('runtime-dom class 归一化', () => {
  it('字符串 class 直接写入', () => {
    const container = renderIntoNewContainer(<div class="foo bar">text</div>)

    const element = within(container).getByText('text')

    expect(element.className).toBe('foo bar')
  })

  it('数组 class 会递归展开', () => {
    const container = renderIntoNewContainer(
      <div class={['foo', ['bar', undefined], 'baz']}>text</div>,
    )

    const element = within(container).getByText('text')

    expect(element.className).toBe('foo bar baz')
  })

  it('对象 class 仅保留 truthy 键', () => {
    const container = renderIntoNewContainer(
      <div class={{ foo: true, bar: false, baz: 1, qux: 0 }}>text</div>,
    )

    const element = within(container).getByText('text')

    expect(element.className).toBe('foo baz')
  })

  it('混合数组与对象写法', () => {
    const container = renderIntoNewContainer(
      <div class={['foo', { bar: true, baz: false }, ['qux', { quux: true }]]}>text</div>,
    )

    const element = within(container).getByText('text')

    expect(element.className).toBe('foo bar qux quux')
  })

  it('空值应输出空 className', () => {
    const container = renderIntoNewContainer(<div class={null}>text</div>)

    const element = within(container).getByText('text')

    expect(element.className).toBe('')
  })

  it('相同 class 更新不会重复写入 DOM', () => {
    const container = createTestContainer()

    render(<div class={['foo', 'bar']}>text</div>, container)

    const element = within(container).getByText('text')
    const setSpy = vi.spyOn(element, 'className', 'set')

    render(<div class={['foo', 'bar']}>text</div>, container)

    expect(setSpy).not.toHaveBeenCalled()

    setSpy.mockRestore()
  })
})
