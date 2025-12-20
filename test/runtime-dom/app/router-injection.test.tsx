import { describe, expect, it, vi } from 'vitest'
import { createRenderlessComponent, createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { createApp, createRouter, ref, RouterLink, RouterView } from '@/index.ts'
import { invokerCacheKey } from '@/runtime-dom/index.ts'
import { routerDuplicateInstallOnApp } from '@/messages/index.ts'

type EventListenerCall = Parameters<typeof globalThis.removeEventListener>

/** 构造仅含一个根路由的 router，方便复用测试框架。 */
const createSingleRouteRouter = (
  component: SetupComponent,
  fallback: SetupComponent = createRenderlessComponent(),
) => {
  return createRouter({
    routes: [{ path: '/', component }],
    fallback,
  })
}

/** 过滤出与 `popstate` 相关的监听调用，辅助比对 add/remove 对齐。 */
const filterPopstateCalls = (calls: EventListenerCall[]) => {
  return calls.filter(([event]) => {
    return event === 'popstate'
  })
}

describe('runtime-dom router 注入', () => {
  it('router.install 只启动一次且在 app.unmount 时自动停止', () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener')
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener')

    const Home = createRenderlessComponent()
    const NotFound = createRenderlessComponent()
    const router = createSingleRouteRouter(Home, NotFound)

    const Root = createRenderlessComponent()

    const app = createApp(Root)

    app.use(router)
    app.unmount()

    const popstateRemoveCalls = filterPopstateCalls(removeSpy.mock.calls)
    const popstateAddCalls = filterPopstateCalls(addSpy.mock.calls)

    expect(popstateRemoveCalls.length).toBe(1)

    const removedHandler = popstateRemoveCalls[0][1]
    const popstateAddCountForRemovedHandler = popstateAddCalls.filter(([, handler]) => {
      return handler === removedHandler
    }).length

    expect(popstateAddCountForRemovedHandler).toBe(1)
  })

  it('在同一 app 上安装多个 router 时抛错', () => {
    const Home = createRenderlessComponent()
    const NotFound = createRenderlessComponent()

    const routerA = createSingleRouteRouter(Home, NotFound)
    const routerB = createSingleRouteRouter(Home, NotFound)

    const Root = createRenderlessComponent()

    const app = createApp(Root)

    app.use(routerA)

    expect(() => {
      app.use(routerB)
    }).toThrowError(routerDuplicateInstallOnApp)
  })

  it('共享 router 仅在最后一个 app unmount 后停止', () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener')
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener')

    const Home = createRenderlessComponent()
    const NotFound = createRenderlessComponent()
    const router = createSingleRouteRouter(Home, NotFound)

    const Root = createRenderlessComponent()

    const appA = createApp(Root)
    const appB = createApp(Root)

    appA.use(router)
    appB.use(router)

    appA.unmount()
    const popstateRemoveCountAfterFirstUnmount = filterPopstateCalls(removeSpy.mock.calls).length

    appB.unmount()

    const popstateRemoveCalls = filterPopstateCalls(removeSpy.mock.calls)
    const popstateAddCalls = filterPopstateCalls(addSpy.mock.calls)
    const newPopstateRemoveCalls = popstateRemoveCalls.slice(popstateRemoveCountAfterFirstUnmount)

    /* 仅在第二次卸载时应匹配到此前 add 的 handler，确保共享 router 延后清理。 */
    const routerRemoveCall = newPopstateRemoveCalls.find((removeCall) => {
      return popstateAddCalls.some((addCall) => {
        return addCall[1] === removeCall[1]
      })
    })

    expect(routerRemoveCall).toBeTruthy()

    const routerRemovedHandler = routerRemoveCall![1]

    const routerRemovedEarly = popstateRemoveCalls
      .slice(0, popstateRemoveCountAfterFirstUnmount)
      .some((call) => {
        return call[1] === routerRemovedHandler
      })

    expect(routerRemovedEarly).toBe(false)

    const routerRemoveCount = popstateRemoveCalls.filter((call) => {
      return call[1] === routerRemovedHandler
    }).length

    expect(routerRemoveCount).toBe(1)
  })

  it('RouterView 在插件安装后无需 router prop 即可工作', () => {
    const rendered = ref('')

    const Home: SetupComponent = () => {
      rendered.value = 'home'

      return () => {
        return undefined
      }
    }

    const NotFound: SetupComponent = () => {
      rendered.value = '404'

      return () => {
        return undefined
      }
    }

    const router = createSingleRouteRouter(Home, NotFound)

    expect(router.currentRoute.value.component).toBe(Home)

    const Root: SetupComponent = () => {
      return () => {
        return <RouterView />
      }
    }

    const app = createApp(Root)

    app.use(router)
    app.mount(createTestContainer())

    expect(rendered.value).toBe('home')

    app.unmount()
    router.stop()
  })

  it('RouterLink 点击时使用注入的 router', () => {
    const Home = createRenderlessComponent()
    const NotFound = createRenderlessComponent()
    const router = createSingleRouteRouter(Home, NotFound)

    const navigateSpy = vi.spyOn(router, 'navigate')

    const Root: SetupComponent = () => {
      return () => {
        return <RouterLink to="/counter">go</RouterLink>
      }
    }

    const app = createApp(Root)

    app.use(router)
    app.mount(createTestContainer())

    const anchor = document.querySelector('a')

    expect(anchor).toBeTruthy()

    anchor!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(navigateSpy).toHaveBeenCalledWith('/counter')

    app.unmount()
    router.stop()
  })

  it('RouterLink 对修饰键/中键点击保持默认行为', () => {
    const Home = createRenderlessComponent()
    const NotFound = createRenderlessComponent()
    const router = createSingleRouteRouter(Home, NotFound)

    const navigateSpy = vi.spyOn(router, 'navigate')

    const Root: SetupComponent = () => {
      return () => {
        return <RouterLink to="/counter">go</RouterLink>
      }
    }

    const app = createApp(Root)

    app.use(router)
    app.mount(createTestContainer())

    const anchor = document.querySelector('a') as HTMLAnchorElement & {
      [invokerCacheKey]?: Record<string, (event: Event) => void>
    }

    expect(anchor).toBeTruthy()

    const clickInvoker = anchor[invokerCacheKey]?.click

    const trigger = (init?: MouseEventInit, presetPrevented = false): MouseEvent => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init })

      if (presetPrevented) {
        event.preventDefault()
      }

      clickInvoker?.(event)

      return event
    }

    expect(trigger({ metaKey: true }).defaultPrevented).toBe(false)
    expect(trigger({ ctrlKey: true }).defaultPrevented).toBe(false)
    expect(trigger({ shiftKey: true }).defaultPrevented).toBe(false)
    expect(trigger({ altKey: true }).defaultPrevented).toBe(false)
    expect(trigger({ button: 1 }).defaultPrevented).toBe(false)

    const prevented = trigger({}, true)

    expect(prevented.defaultPrevented).toBe(true)
    expect(navigateSpy).not.toHaveBeenCalled()

    app.unmount()
    router.stop()
  })

  it('RouterLink 将 target=_blank 导航交给浏览器处理', () => {
    const Home = createRenderlessComponent()
    const NotFound = createRenderlessComponent()
    const router = createSingleRouteRouter(Home, NotFound)

    const navigateSpy = vi.spyOn(router, 'navigate')

    const Root: SetupComponent = () => {
      return () => {
        return (
          <RouterLink to="/counter" target="_blank">
            go
          </RouterLink>
        )
      }
    }

    const app = createApp(Root)

    app.use(router)
    app.mount(createTestContainer())

    const anchor = document.querySelector('a') as HTMLAnchorElement & {
      [invokerCacheKey]?: Record<string, (event: Event) => void>
    }

    expect(anchor).toBeTruthy()

    const clickInvoker = anchor[invokerCacheKey]?.click
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })

    clickInvoker?.(event)

    expect(event.defaultPrevented).toBe(false)
    expect(navigateSpy).not.toHaveBeenCalled()

    app.unmount()
    router.stop()
  })

  it('路由组件内的 RouterView 不会无限递归', () => {
    globalThis.history.replaceState(null, '', '/')
    const renderedNested = ref(false)

    const Home: SetupComponent = () => {
      renderedNested.value = true

      return () => {
        return (
          <div className="home">
            <RouterView />
          </div>
        )
      }
    }

    const NotFound: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const router = createSingleRouteRouter(Home, NotFound)

    expect(router.currentRoute.value.component).toBe(Home)

    const Root: SetupComponent = () => {
      return () => {
        return <RouterView />
      }
    }

    const app = createApp(Root)

    app.use(router)

    expect(() => {
      app.mount(createTestContainer())
    }).not.toThrow()

    expect(renderedNested.value).toBe(true)
    expect(document.querySelector('.home')).toBeTruthy()

    app.unmount()
    router.stop()
  })

  it('通过 RouterLink 导航时 RouterView 会重新渲染', async () => {
    globalThis.history.replaceState(null, '', '/a')
    const rendered = ref('')

    const A: SetupComponent = () => {
      rendered.value = 'a'

      return () => {
        return <div className="route-a">A</div>
      }
    }

    const B: SetupComponent = () => {
      rendered.value = 'b'

      return () => {
        return <div className="route-b">B</div>
      }
    }

    const NotFound: SetupComponent = () => {
      rendered.value = '404'

      return () => {
        return <div className="route-404">404</div>
      }
    }

    const router = createRouter({
      routes: [
        { path: '/a', component: A },
        { path: '/b', component: B },
      ],
      fallback: NotFound,
    })

    const Root: SetupComponent = () => {
      return () => {
        return (
          <div>
            <RouterLink to="/b">go</RouterLink>
            <RouterView />
          </div>
        )
      }
    }

    const app = createApp(Root)

    app.use(router)
    app.mount(createTestContainer())

    expect(rendered.value).toBe('a')
    expect(document.querySelector('.route-a')).toBeTruthy()

    const anchor = document.querySelector('a')

    expect(anchor).toBeTruthy()

    anchor!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(rendered.value).toBe('b')
    expect(document.querySelector('.route-b')).toBeTruthy()

    app.unmount()
    router.stop()
  })
})
