import { describe, expect, it } from 'vitest'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { nextTick, render, state } from '@/index.ts'

describe('runtime-dom render: 组件锚点回归', () => {
  it('隐藏子组件内容 → 打乱列表 → 再显示，不应复活旧节点导致重复', async () => {
    interface Todo {
      id: number
      text: string
    }

    const list = state<Todo[]>([
      { id: 0, text: '蔬菜' },
      { id: 1, text: '奶酪' },
      { id: 2, text: '人类应该吃的其他东西' },
    ])
    const show = state(true)

    const TodoItem: SetupComponent<{ todo: Todo; show?: boolean }> = (props) => {
      return () => {
        if (props.show === false) {
          return undefined
        }

        return <li>{props.todo.text}</li>
      }
    }

    const App: SetupComponent = () => {
      return () => {
        return (
          <ol>
            {list.get().map((todo) => {
              return <TodoItem key={todo.id} todo={todo} show={show.get()} />
            })}
          </ol>
        )
      }
    }

    const container = createTestContainer()

    render(<App />, container)

    expect(container.querySelectorAll('li')).toHaveLength(3)

    show.set(false)
    await nextTick()
    expect(container.querySelectorAll('li')).toHaveLength(0)

    list.set([list.get()[2], list.get()[0], list.get()[1]])
    await nextTick()
    expect(container.querySelectorAll('li')).toHaveLength(0)

    show.set(true)
    await nextTick()

    const texts = [...container.querySelectorAll('li')].map((node) => {
      return node.textContent ?? ''
    })

    expect(texts).toEqual(['人类应该吃的其他东西', '蔬菜', '奶酪'])
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('空渲染占位（Comment）→ keyed 重排 → 再渲染多节点，顺序应正确且不重复', async () => {
    const order = state(['a', 'b', 'c'])
    const show = state(true)

    const Item: SetupComponent<{ id: string; show: boolean }> = (props) => {
      return () => {
        if (!props.show) {
          return false
        }

        return [<li>{`${props.id}-1`}</li>, <li>{`${props.id}-2`}</li>]
      }
    }

    const App: SetupComponent = () => {
      return () => {
        return (
          <ol>
            {order.get().map((id) => {
              return <Item key={id} id={id} show={show.get()} />
            })}
          </ol>
        )
      }
    }

    const container = createTestContainer()

    render(<App />, container)
    expect(
      [...container.querySelectorAll('li')].map((node) => {
        return node.textContent ?? ''
      }),
    ).toEqual(['a-1', 'a-2', 'b-1', 'b-2', 'c-1', 'c-2'])

    show.set(false)
    await nextTick()
    expect(container.querySelectorAll('li')).toHaveLength(0)

    order.set(['c', 'a', 'b'])
    await nextTick()
    expect(container.querySelectorAll('li')).toHaveLength(0)

    show.set(true)
    await nextTick()

    const texts = [...container.querySelectorAll('li')].map((node) => {
      return node.textContent ?? ''
    })

    expect(texts).toEqual(['c-1', 'c-2', 'a-1', 'a-2', 'b-1', 'b-2'])
    expect(new Set(texts).size).toBe(texts.length)
  })
})
