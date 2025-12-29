import { describe, expect, it } from 'vitest'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { Fragment, nextTick, render, state } from '@/index.ts'

describe('runtime-dom render: 锚点边界用例', () => {
  it('组件从末尾变为非末尾后，后续在其前插入节点仍应保持顺序', async () => {
    const phase = state(0)

    const Child: SetupComponent = () => {
      return () => {
        return <span>comp</span>
      }
    }

    const App: SetupComponent = () => {
      return () => {
        if (phase.get() === 0) {
          return (
            <div>
              <Child key="comp" />
            </div>
          )
        }

        if (phase.get() === 1) {
          return (
            <div>
              <Child key="comp" />
              <span key="tail">tail</span>
            </div>
          )
        }

        return (
          <div>
            <span key="head">head</span>
            <Child key="comp" />
            <span key="tail">tail</span>
          </div>
        )
      }
    }

    const container = createTestContainer()

    render(<App />, container)
    expect(
      Array.from(container.querySelectorAll('span')).map((node) => {
        return node.textContent ?? ''
      }),
    ).toEqual(['comp'])

    phase.set(1)
    await nextTick()
    expect(
      Array.from(container.querySelectorAll('span')).map((node) => {
        return node.textContent ?? ''
      }),
    ).toEqual(['comp', 'tail'])

    phase.set(2)
    await nextTick()
    expect(
      Array.from(container.querySelectorAll('span')).map((node) => {
        return node.textContent ?? ''
      }),
    ).toEqual(['head', 'comp', 'tail'])
  })

  it('Fragment 子树清空后重排，再恢复渲染不应复活旧节点', async () => {
    const show = state(true)
    const order = state(['a', 'b', 'c'])

    const App: SetupComponent = () => {
      return () => {
        return (
          <ol>
            {order.get().map((key) => {
              return (
                <Fragment key={key}>
                  {show.get() ? <li>{`${key}-1`}</li> : null}
                  {show.get() ? <li>{`${key}-2`}</li> : null}
                </Fragment>
              )
            })}
          </ol>
        )
      }
    }

    const container = createTestContainer()

    render(<App />, container)
    expect(
      Array.from(container.querySelectorAll('li')).map((node) => {
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

    const texts = Array.from(container.querySelectorAll('li')).map((node) => {
      return node.textContent ?? ''
    })

    expect(texts).toEqual(['c-1', 'c-2', 'a-1', 'a-2', 'b-1', 'b-2'])
    expect(new Set(texts).size).toBe(texts.length)
  })
})

