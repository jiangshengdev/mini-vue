/**
 * Playground 路由与入口回归测试。
 *
 * 覆盖路由匹配、App+Router 渲染以及入口挂载行为。
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { CounterDemo } from '../views/counter-demo.tsx'
import { HelloWorld } from '../views/basic/hello-world.tsx'
import { AnchorSimpleComponent } from '../views/anchor/index.ts'
import { NotFound } from '../views/not-found.tsx'
import { App } from '../app.tsx'
import { router } from '../router/index.ts'
import type * as IndexModule from '@/index.ts'
import { createHostWithApp } from '$/index.ts'

const appMocks = vi.hoisted(() => {
  return {
    useMock: vi.fn(),
    mountMock: vi.fn(),
  }
})

vi.mock('@/index.ts', async () => {
  const actual = await vi.importActual<typeof IndexModule>('@/index.ts')

  return {
    ...actual,
    createApp(...args: Parameters<typeof actual.createApp>) {
      const app = actual.createApp(...args)
      const originalUse = app.use.bind(app)
      const originalMount = app.mount.bind(app)

      app.use = (plugin) => {
        appMocks.useMock(plugin)

        originalUse(plugin)
      }

      app.mount = (host) => {
        appMocks.mountMock(host)

        originalMount(host)
      }

      return app
    },
  }
})

describe('playground/router', () => {
  afterEach(() => {
    router.stop()
  })

  it('应匹配已注册路径并返回对应组件', () => {
    router.navigate('/basic/hello-world')
    expect(router.currentRoute.value.component).toBe(HelloWorld)

    router.navigate('/counter')
    expect(router.currentRoute.value.component).toBe(CounterDemo)

    router.navigate('/anchor/simple-component')
    expect(router.currentRoute.value.component).toBe(AnchorSimpleComponent)
  })

  it('未命中路由时应回退到 NotFound', () => {
    router.navigate('/unknown-path')
    expect(router.currentRoute.value.component).toBe(NotFound)
  })
})

describe('playground/app', () => {
  it('应通过 RouterView 渲染当前路由组件并展示导航', async () => {
    const { app, container } = createHostWithApp(App)

    globalThis.history.pushState(null, '', '/counter')

    app.use(router)
    app.mount(container)

    router.navigate('/counter')
    expect(router.currentRoute.value.component).toBe(CounterDemo)
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })

    expect(container.textContent).toContain('计数器示例')

    app.unmount()
  })
})

describe('playground/main', () => {
  afterEach(() => {
    appMocks.useMock.mockReset()
    appMocks.mountMock.mockReset()
    document.body.innerHTML = ''
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('应在入口文件中挂载应用并安装路由', async () => {
    const host = document.createElement('div')

    host.id = 'app'
    document.body.append(host)

    await import('../main.ts')

    expect(appMocks.useMock).toHaveBeenCalled()
    expect(appMocks.mountMock).toHaveBeenCalledWith(host)
  })
})
