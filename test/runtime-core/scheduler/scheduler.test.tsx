import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHostRenderer } from '../patch/test-utils.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import { nextTick, ref, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'
import { createRenderer } from '@/runtime-core/index.ts'

describe('runtime-core 调度器', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('组件更新走异步调度并在同一 tick 去重', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const count = ref(0)
    const renderSpy = vi.fn()

    const App: SetupComponent = () => {
      return () => {
        renderSpy()

        return <div>{count.value}</div>
      }
    }

    renderer.render(<App />, host.container)

    expect(renderSpy).toHaveBeenCalledTimes(1)

    count.value = 1
    count.value = 2

    /* 更新应延迟到微任务，且同一 tick 合并为一次。 */
    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(host.container.children[0]?.children[0]?.text).toBe('0')

    await nextTick()

    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(host.container.children[0]?.children[0]?.text).toBe('2')
  })

  it('flush 过程中新增的任务会在同一轮执行', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const count = ref(0)
    const flag = ref(false)
    let depRenderText: string | undefined

    const Trigger: SetupComponent = () => {
      return () => {
        if (count.value === 1) {
          flag.value = true
        }

        return <div>count:{count.value}</div>
      }
    }

    const Dep: SetupComponent = () => {
      return () => {
        const text = `flag:${flag.value ? 'yes' : 'no'}`

        depRenderText = text

        return <div>{text}</div>
      }
    }

    renderer.render(
      <div>
        <Trigger />
        <Dep />
      </div>,
      host.container,
    )

    count.value = 1

    await nextTick()

    expect(depRenderText).toBe('flag:yes')
  })

  it('队列中的错误不会阻断后续任务并触发统一错误处理', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const count = ref(0)
    const handler = vi.fn<ErrorHandler>()
    let crashRenderText: string | undefined
    let stableRenderText: string | undefined

    setErrorHandler(handler)

    let shouldThrow = true

    const Crash: SetupComponent = () => {
      return () => {
        if (count.value === 1 && shouldThrow) {
          shouldThrow = false
          throw new Error('render crash')
        }

        const text = `crash:${count.value}`

        crashRenderText = text

        return <div>{text}</div>
      }
    }

    const Stable: SetupComponent = () => {
      return () => {
        const text = `stable:${count.value}`

        stableRenderText = text

        return <div>{text}</div>
      }
    }

    renderer.render(
      <div>
        <Crash />
        <Stable />
      </div>,
      host.container,
    )

    count.value = 1

    await nextTick()

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error.message).toBe('render crash')
    expect(context).toBe(errorContexts.effectRunner)
    /* Crash 更新失败不影响队列内的其他任务。 */
    expect(stableRenderText).toBe('stable:1')
    expect(crashRenderText).toBe('crash:0')
  })

  it('nextTick 支持回调与 await 语法', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const count = ref(0)
    const callback = vi.fn()

    const App: SetupComponent = () => {
      return () => {
        return <div>{count.value}</div>
      }
    }

    renderer.render(<App />, host.container)

    count.value = 1

    await nextTick(() => {
      callback(host.container.children[0]?.children[0]?.text)
    })

    expect(callback).toHaveBeenCalledWith('1')

    count.value = 2

    await nextTick()

    expect(host.container.children[0]?.children[0]?.text).toBe('2')
  })
})
