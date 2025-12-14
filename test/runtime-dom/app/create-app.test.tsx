import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/dom'
import { createTestContainer } from '../../setup.ts'
import type { SetupComponent } from '@/index.ts'
import { createApp, reactive } from '@/index.ts'

const App: SetupComponent = () => {
  return () => {
    return <div class="hello">Hello</div>
  }
}

type HotHandler = () => void

interface HotMock {
  on(event: string, handler: HotHandler): void
  dispose(handler: HotHandler): void
  trigger(event: string): void
  triggerDispose(): void
  getHandlers(event: string): HotHandler[]
}

function createHotMock(): HotMock {
  const handlers = new Map<string, HotHandler[]>()
  const disposeHandlers: HotHandler[] = []

  return {
    on(event, handler) {
      const existing = handlers.get(event) ?? []

      existing.push(handler)
      handlers.set(event, existing)
    },
    dispose(handler) {
      disposeHandlers.push(handler)
    },
    trigger(event) {
      handlers.get(event)?.forEach((handler) => {
        handler()
      })
    },
    triggerDispose() {
      disposeHandlers.forEach((handler) => {
        handler()
      })
    },
    getHandlers(event) {
      return handlers.get(event) ?? []
    },
  }
}

describe('runtime-dom createApp', () => {
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

    const Root: SetupComponent = () => {
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

    const Root: SetupComponent = () => {
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

  it('在 Vite HMR 下会卸载并按原容器重挂', () => {
    const globalWithHot = globalThis as { __MINI_VUE_HMR_HOT__?: HotMock }
    const originalHot = globalWithHot.__MINI_VUE_HMR_HOT__
    const hotMock = createHotMock()

    globalWithHot.__MINI_VUE_HMR_HOT__ = hotMock

    const renderSpy = vi.fn()

    const Root: SetupComponent = () => {
      return () => {
        renderSpy()

        return <div>hmr-root</div>
      }
    }

    const host = createTestContainer()
    const app = createApp(Root)

    expect(hotMock.getHandlers('vite:beforeUpdate')).not.toHaveLength(0)

    app.mount(host)

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(within(host).getByText('hmr-root')).toBeInTheDocument()

    hotMock.trigger('vite:beforeUpdate')
    expect(host).toBeEmptyDOMElement()

    hotMock.trigger('vite:afterUpdate')
    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(within(host).getByText('hmr-root')).toBeInTheDocument()

    hotMock.triggerDispose()
    expect(host).toBeEmptyDOMElement()

    if (originalHot === undefined) {
      delete globalWithHot.__MINI_VUE_HMR_HOT__
    } else {
      globalWithHot.__MINI_VUE_HMR_HOT__ = originalHot
    }
  })
})
