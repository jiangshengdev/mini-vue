import { describe, expect, it } from 'vitest'
import { createHostRenderer } from '../patch/test-utils.ts'
import type { SetupComponent } from '@/index.ts'
import { createRenderer } from '@/runtime-core/index.ts'
import { effect, isReactive, ref } from '@/index.ts'

describe('runtime-core 组件 props 响应式', () => {
  it('props 为浅只读响应式，依赖追踪随父级更新', () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const message = ref('foo')
    let observed: string | undefined

    const Child: SetupComponent<{ msg: string }> = (props) => {
      effect(() => {
        observed = props.msg
      })

      return () => {
        return <div>{props.msg}</div>
      }
    }

    const Parent: SetupComponent = () => {
      return () => {
        return <Child msg={message.value} />
      }
    }

    renderer.render(<Parent />, host.container)

    expect(observed).toBe('foo')
    message.value = 'bar'

    expect(observed).toBe('bar')
    expect(host.container.children[0]?.children[0]?.text).toBe('bar')
  })

  it('props 只读且不主动深度响应', () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const nested = { foo: 'bar' }
    const message = ref('foo')
    let receivedProps: { msg: string; nested: { foo: string } } | undefined
    let nestedReactive = true
    let nestedEffectRuns = 0

    const Child: SetupComponent<{ msg: string; nested: { foo: string } }> = (props) => {
      receivedProps = props
      nestedReactive = isReactive(props.nested)

      effect(() => {
        nestedEffectRuns += 1
        void props.nested.foo
      })

      return () => {
        return <div>{props.msg}</div>
      }
    }

    const Parent: SetupComponent = () => {
      return () => {
        return <Child msg={message.value} nested={nested} />
      }
    }

    renderer.render(<Parent />, host.container)

    expect(receivedProps?.msg).toBe('foo')
    ;(receivedProps as { msg: string }).msg = 'override'
    expect(receivedProps?.msg).toBe('foo')
    expect(nestedReactive).toBe(false)
    expect(nestedEffectRuns).toBe(1)

    nested.foo = 'baz'
    expect(nestedEffectRuns).toBe(1)

    message.value = 'bar'
    expect(receivedProps?.msg).toBe('bar')
  })
})
