import { spyOnConsole } from '$/test-utils/mocks.ts'
import { beforeEach, describe, expect, it } from 'vitest'
import { createHostRenderer, findHostElementByTag, getHostElementText } from '../host-utils.ts'
import type { SetupComponent } from '@/index.ts'
import { effect, isReactive, nextTick, ref } from '@/index.ts'
import { createRenderer } from '@/runtime-core/index.ts'

describe('runtime-core 组件 props 响应式', () => {
  beforeEach(() => {
    spyOnConsole('warn')
  })

  it('props 为浅只读响应式，依赖追踪随父级更新', async () => {
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

    await nextTick()

    expect(observed).toBe('bar')
    expect(getHostElementText(findHostElementByTag(host.container, 'div'))).toBe('bar')
  })

  it('props 只读且不主动深度响应', async () => {
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

    await nextTick()
    expect(receivedProps?.msg).toBe('bar')
  })
})
