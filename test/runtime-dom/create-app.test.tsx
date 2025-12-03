import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/dom'
import { createTestContainer } from '../setup.ts'
import type { MiniErrorHandler, SetupFunctionComponent } from '@/index.ts'
import { createApp, onScopeDispose, reactive, setMiniErrorHandler } from '@/index.ts'

const App: SetupFunctionComponent = () => {
  return () => {
    return <div class="hello">Hello</div>
  }
}

describe('runtime-dom createApp', () => {
  afterEach(() => {
    setMiniErrorHandler(undefined)
  })

  it('支持通过选择器挂载', () => {
    const host = createTestContainer()

    host.id = 'app'

    const app = createApp(App)

    app.mount('#app')

    expect(screen.getByText('Hello')).toBeVisible()
  })

  it('支持直接传入容器', () => {
    const host = createTestContainer()
    const app = createApp(App)

    app.mount(host)
    const view = within(host)

    expect(view.getByText('Hello')).toHaveClass('hello')
    app.unmount()
    expect(host).toBeEmptyDOMElement()
  })

  it('重复挂载会抛异常', () => {
    const host = createTestContainer()
    const app = createApp(App)

    app.mount(host)
    expect(() => {
      app.mount(host)
    }).toThrowError('当前应用已挂载')
    app.unmount()
  })

  it('卸载后可以重新挂载', () => {
    const host = createTestContainer()
    const app = createApp(App)

    app.mount(host)
    expect(within(host).getByText('Hello')).toHaveClass('hello')

    app.unmount()
    expect(host).toBeEmptyDOMElement()

    app.mount(host)
    expect(within(host).getByText('Hello')).toHaveClass('hello')

    app.unmount()
    expect(host).toBeEmptyDOMElement()
  })

  it('根组件可以直接消费 reactive 并刷新视图', () => {
    const state = reactive({ count: 0 })

    const Root: SetupFunctionComponent = () => {
      return () => {
        return <p>count: {state.count}</p>
      }
    }

    const host = createTestContainer()
    const app = createApp(Root)

    app.mount(host)

    const view = within(host)

    expect(view.getByText('count: 0')).toBeInTheDocument()

    state.count = 1
    expect(view.getByText('count: 1')).toBeInTheDocument()

    app.unmount()
    expect(host).toBeEmptyDOMElement()
  })

  it('根组件卸载后会停止响应式 effect', () => {
    const renderSpy = vi.fn()
    const state = reactive({ on: false })

    const Root: SetupFunctionComponent = () => {
      return () => {
        renderSpy()

        return <span>{state.on ? 'ON' : 'OFF'}</span>
      }
    }

    const host = createTestContainer()
    const app = createApp(Root)

    app.mount(host)

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByText('OFF')).toBeInTheDocument()

    state.on = true
    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(screen.getByText('ON')).toBeInTheDocument()

    app.unmount()
    expect(host).toBeEmptyDOMElement()

    state.on = false
    expect(renderSpy).toHaveBeenCalledTimes(2)
  })

  it('组件清理任务抛错时会通过错误处理器捕获并继续执行剩余清理', () => {
    const handler = vi.fn<MiniErrorHandler>()
    const cleanupOrder: number[] = []

    setMiniErrorHandler(handler)

    const Root: SetupFunctionComponent = () => {
      onScopeDispose(() => {
        cleanupOrder.push(1)
        throw new Error('cleanup 1 failed')
      })

      onScopeDispose(() => {
        cleanupOrder.push(2)
      })

      onScopeDispose(() => {
        cleanupOrder.push(3)
        throw new Error('cleanup 3 failed')
      })

      return () => {
        return <div>Test</div>
      }
    }

    const host = createTestContainer()
    const app = createApp(Root)

    app.mount(host)
    expect(screen.getByText('Test')).toBeInTheDocument()

    app.unmount()

    /* 所有清理任务都应执行，即使某些抛错 */
    expect(cleanupOrder).toEqual([1, 2, 3])

    /* 错误处理器应捕获两个异常 */
    expect(handler).toHaveBeenCalledTimes(2)

    const [error1, context1] = handler.mock.calls[0]

    expect((error1 as Error).message).toBe('cleanup 1 failed')
    expect(context1).toBe('effect-scope-cleanup')

    const [error2, context2] = handler.mock.calls[1]

    expect((error2 as Error).message).toBe('cleanup 3 failed')
    expect(context2).toBe('effect-scope-cleanup')
  })
})
