import { describe, expect, it } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer, renderIntoNewContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { nextTick, reactive, render } from '@/index.ts'

describe('runtime-dom children 形态', () => {
  it('无 children 时 props.children 为 undefined', () => {
    const received: unknown[] = []

    const Capture: SetupComponent = (props) => {
      received.push(props.children)

      return () => {
        return <section>{props.children}</section>
      }
    }

    const container = renderIntoNewContainer(<Capture />)

    expect(received).toHaveLength(1)
    expect(received[0]).toBeUndefined()
    expect(container.querySelector('section')).toBeEmptyDOMElement()
  })

  it('单个 children 时 props.children 为该节点', () => {
    const received: unknown[] = []

    const Capture: SetupComponent = (props) => {
      received.push(props.children)

      return () => {
        return <section>{props.children}</section>
      }
    }

    const container = renderIntoNewContainer(
      <Capture>
        <span>only</span>
      </Capture>,
    )

    expect(received).toHaveLength(1)
    const child = received[0]

    expect(child).toBeDefined()
    expect(Array.isArray(child)).toBe(false)

    const view = within(container.querySelector('section')!)

    expect(view.getByText('only')).toHaveTextContent('only')
  })

  it('多个 children 时 props.children 为数组', () => {
    const received: unknown[] = []

    const Capture: SetupComponent = (props) => {
      received.push(props.children)

      return () => {
        return <section>{props.children}</section>
      }
    }

    const container = renderIntoNewContainer(
      <Capture>
        <span>first</span>
        <b>second</b>
      </Capture>,
    )

    expect(received).toHaveLength(1)
    expect(Array.isArray(received[0])).toBe(true)
    expect(received[0]).toHaveLength(2)

    const view = within(container.querySelector('section')!)

    expect(view.getByText('first')).toBeDefined()
    expect(view.getByText('second')).toBeDefined()
  })

  it('组件重渲染不会改变兄弟顺序', async () => {
    const state = reactive({ mid: 'middle' })

    const Middle: SetupComponent = () => {
      return () => {
        return <span data-testid="mid">{state.mid}</span>
      }
    }

    const container = createTestContainer()

    render(
      <section>
        <span data-testid="first">first</span>
        <Middle />
        <span data-testid="last">last</span>
      </section>,
      container,
    )

    const section = container.querySelector('section')!
    const readOrder = () => {
      return [...section.children].map((element) => {
        return element.textContent
      })
    }

    expect(readOrder()).toEqual(['first', 'middle', 'last'])

    state.mid = 'updated'

    await nextTick()

    expect(readOrder()).toEqual(['first', 'updated', 'last'])
  })

  it('Fragment 包单组件时重渲染不会改变兄弟顺序', async () => {
    const state = reactive({ mid: 'middle' })

    const Middle: SetupComponent = () => {
      return () => {
        return <span data-testid="mid">{state.mid}</span>
      }
    }

    const container = createTestContainer()

    render(
      <section>
        <span data-testid="first">first</span>
        <>
          <Middle />
        </>
        <span data-testid="last">last</span>
      </section>,
      container,
    )

    const section = container.querySelector('section')!
    const readOrder = () => {
      return [...section.children].map((element) => {
        return element.textContent
      })
    }

    expect(readOrder()).toEqual(['first', 'middle', 'last'])

    state.mid = 'updated'

    await nextTick()

    expect(readOrder()).toEqual(['first', 'updated', 'last'])
  })
})
