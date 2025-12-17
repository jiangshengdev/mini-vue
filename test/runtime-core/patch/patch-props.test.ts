import { describe, expect, it, vi } from 'vitest'
import { patchProps } from '@/runtime-dom/patch-props.ts'

/**
 * **Feature: vnode-diff-patch, Property 3: Props 差量正确应用**
 * **Validates: Requirements 2.1, 2.2**
 */
describe('patchProps - Props 差量正确应用', () => {
  it('mount 阶段应用所有 nextProps', () => {
    const element = document.createElement('div')

    patchProps(element, undefined, { id: 'test', title: 'hello' })

    expect(element.getAttribute('id')).toBe('test')
    expect(element.getAttribute('title')).toBe('hello')
  })

  it('update 阶段添加新属性', () => {
    const element = document.createElement('div')

    patchProps(element, undefined, { id: 'test' })
    patchProps(element, { id: 'test' }, { id: 'test', title: 'hello' })

    expect(element.getAttribute('id')).toBe('test')
    expect(element.getAttribute('title')).toBe('hello')
  })

  it('update 阶段更新已有属性', () => {
    const element = document.createElement('div')

    patchProps(element, undefined, { id: 'old' })
    patchProps(element, { id: 'old' }, { id: 'new' })

    expect(element.getAttribute('id')).toBe('new')
  })

  it('update 阶段移除缺失属性', () => {
    const element = document.createElement('div')

    patchProps(element, undefined, { id: 'test', title: 'hello' })
    patchProps(element, { id: 'test', title: 'hello' }, { id: 'test' })

    expect(element.getAttribute('id')).toBe('test')
    expect(element.hasAttribute('title')).toBe(false)
  })

  it('class 属性正确更新', () => {
    const element = document.createElement('div')

    patchProps(element, undefined, { class: 'foo bar' })
    expect(element.className).toBe('foo bar')

    patchProps(element, { class: 'foo bar' }, { class: 'baz' })
    expect(element.className).toBe('baz')
  })

  it('class 属性移除时清空 className', () => {
    const element = document.createElement('div')

    patchProps(element, undefined, { class: 'foo' })
    patchProps(element, { class: 'foo' }, {})

    expect(element.className).toBe('')
  })

  it('style 对象差量更新', () => {
    const element = document.createElement('div')

    patchProps(element, undefined, { style: { color: 'red', fontSize: '12px' } })
    expect(element.style.color).toBe('red')
    expect(element.style.fontSize).toBe('12px')

    patchProps(
      element,
      { style: { color: 'red', fontSize: '12px' } },
      { style: { color: 'blue' } },
    )
    expect(element.style.color).toBe('blue')
    expect(element.style.fontSize).toBe('')
  })

  it('style 属性移除时清空所有样式', () => {
    const element = document.createElement('div')

    patchProps(element, undefined, { style: { color: 'red' } })
    patchProps(element, { style: { color: 'red' } }, {})

    expect(element.hasAttribute('style')).toBe(false)
  })
})

/**
 * **Feature: vnode-diff-patch, Property 4: 事件更新不叠加**
 * **Validates: Requirements 2.3**
 */
describe('patchProps - 事件更新不叠加', () => {
  it('事件 handler 更新后只触发新 handler', () => {
    const element = document.createElement('button')
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    patchProps(element, undefined, { onClick: handler1 })
    element.click()
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(0)

    patchProps(element, { onClick: handler1 }, { onClick: handler2 })
    element.click()
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('事件 handler 移除后不再触发', () => {
    const element = document.createElement('button')
    const handler = vi.fn()

    patchProps(element, undefined, { onClick: handler })
    element.click()
    expect(handler).toHaveBeenCalledTimes(1)

    patchProps(element, { onClick: handler }, {})
    element.click()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('多次更新 handler 不会叠加监听器', () => {
    const element = document.createElement('button')
    const calls: number[] = []

    const handler1 = () => {
      calls.push(1)
    }
    const handler2 = () => {
      calls.push(2)
    }
    const handler3 = () => {
      calls.push(3)
    }

    patchProps(element, undefined, { onClick: handler1 })
    patchProps(element, { onClick: handler1 }, { onClick: handler2 })
    patchProps(element, { onClick: handler2 }, { onClick: handler3 })

    element.click()

    expect(calls).toEqual([3])
  })
})
