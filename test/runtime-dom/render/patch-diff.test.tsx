import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { reactive, render } from '@/index.ts'

describe('runtime-dom patch/diff', () => {
  it('组件更新复用同一文本节点', () => {
    const container = createTestContainer()
    const state = reactive({ msg: 'hello' })

    const App: SetupComponent = () => {
      return () => {
        return <p>{state.msg}</p>
      }
    }

    render(<App />, container)

    const textNode = container.querySelector('p')?.firstChild

    state.msg = 'world'

    expect(container.querySelector('p')?.firstChild).toBe(textNode)
    expect(container.querySelector('p')?.textContent).toBe('world')
  })

  it('元素 props 可更新并移除，同时事件监听保持最新', async () => {
    const container = createTestContainer()
    const firstClick = vi.fn()
    const nextClick = vi.fn()
    const state = reactive({
      cls: 'active',
      color: 'red',
      id: 'first',
      handler: firstClick,
    })

    const App: SetupComponent = () => {
      return () => {
        return (
          <button
            class={state.cls}
            style={{ color: state.color }}
            data-id={state.id}
            onClick={state.handler}
          >
            button
          </button>
        )
      }
    }

    render(<App />, container)

    const button = container.querySelector('button')!
    const user = userEvent.setup()

    await user.click(button)
    expect(firstClick).toHaveBeenCalledTimes(1)

    state.cls = ''
    state.color = undefined as never
    state.id = undefined as never
    state.handler = nextClick

    await user.click(button)

    expect(nextClick).toHaveBeenCalledTimes(1)
    expect(firstClick).toHaveBeenCalledTimes(1)
    expect(button.className).toBe('')
    expect(button.getAttribute('style')).toBe(null)
    expect(button.dataset.id).toBeUndefined()
  })

  it('keyed children 只移动不重建节点', () => {
    const container = createTestContainer()
    const state = reactive({
      items: ['a', 'b', 'c'],
    })

    const App: SetupComponent = () => {
      return () => {
        return (
          <ul>
            {state.items.map((item) => {
              return <li key={item}>{item}</li>
            })}
          </ul>
        )
      }
    }

    render(<App />, container)

    const initialNodes = [...container.querySelectorAll('li')]

    state.items = ['c', 'a', 'b']

    const updatedNodes = [...container.querySelectorAll('li')]

    expect(
      updatedNodes.map((node) => {
        return node.textContent
      }),
    ).toEqual(['c', 'a', 'b'])
    expect(updatedNodes[0]).toBe(initialNodes[2])
    expect(updatedNodes[1]).toBe(initialNodes[0])
    expect(updatedNodes[2]).toBe(initialNodes[1])
  })
})
