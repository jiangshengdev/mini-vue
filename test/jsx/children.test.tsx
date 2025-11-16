import { describe, expect, it } from 'vitest'
import { within } from '@testing-library/dom'
import type { ComponentType } from '@/index.ts'
import { render } from '@/index.ts'
import { createTestContainer } from '../setup.ts'

describe('jsx children shape', () => {
  it('无 children 时 props.children 为 undefined', () => {
    const received: unknown[] = []

    const Capture: ComponentType = (props) => {
      received.push(props.children)
      return <section>{props.children}</section>
    }

    const container = createTestContainer()
    render(<Capture />, container)

    expect(received).toHaveLength(1)
    expect(received[0]).toBeUndefined()
    expect(container.querySelector('section')).toBeEmptyDOMElement()
  })

  it('单个 children 时 props.children 为该节点', () => {
    const received: unknown[] = []

    const Capture: ComponentType = (props) => {
      received.push(props.children)
      return <section>{props.children}</section>
    }

    const container = createTestContainer()
    render(
      <Capture>
        <span>only</span>
      </Capture>,
      container,
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

    const Capture: ComponentType = (props) => {
      received.push(props.children)
      return <section>{props.children}</section>
    }

    const container = createTestContainer()
    render(
      <Capture>
        <span>first</span>
        <b>second</b>
      </Capture>,
      container,
    )

    expect(received).toHaveLength(1)
    expect(Array.isArray(received[0])).toBe(true)
    expect(received[0]).toHaveLength(2)

    const view = within(container.querySelector('section')!)
    expect(view.getByText('first')).toBeDefined()
    expect(view.getByText('second')).toBeDefined()
  })
})
