import { describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../../setup.ts'
import type { SetupComponent } from '@/index.ts'
import { createApp, createRouter, ref, RouterLink, RouterView } from '@/index.ts'
import { invokerCacheKey } from '@/runtime-dom/index.ts'
import { routerDuplicateInstallOnApp } from '@/messages/index.ts'

describe('runtime-dom: router injection', () => {
  it('router.install starts once and auto-stops on app.unmount', () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener')
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener')

    const Home: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const NotFound: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

    const Root: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const app = createApp(Root)

    app.use(router)
    app.unmount()

    const popstateRemoveCalls = removeSpy.mock.calls.filter((call) => {
      return call[0] === 'popstate'
    })

    expect(popstateRemoveCalls.length).toBe(1)

    const removedHandler = popstateRemoveCalls[0][1]
    const popstateAddCountForRemovedHandler = addSpy.mock.calls.filter((call) => {
      return call[0] === 'popstate' && call[1] === removedHandler
    }).length

    expect(popstateAddCountForRemovedHandler).toBe(1)
  })

  it('throws when installing multiple routers on the same app', () => {
    const Home: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const NotFound: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const routerA = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })
    const routerB = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

    const Root: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const app = createApp(Root)

    app.use(routerA)

    expect(() => {
      app.use(routerB)
    }).toThrowError(routerDuplicateInstallOnApp)
  })

  it('shared router only stops after last app unmount', () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener')
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener')

    const Home: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const NotFound: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

    const Root: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const appA = createApp(Root)
    const appB = createApp(Root)

    appA.use(router)
    appB.use(router)

    appA.unmount()
    const popstateRemoveCountAfterFirstUnmount = removeSpy.mock.calls.filter((call) => {
      return call[0] === 'popstate'
    }).length

    appB.unmount()

    const popstateRemoveCalls = removeSpy.mock.calls.filter((call) => {
      return call[0] === 'popstate'
    })
    const newPopstateRemoveCalls = popstateRemoveCalls.slice(popstateRemoveCountAfterFirstUnmount)

    const routerRemoveCall = newPopstateRemoveCalls.find((removeCall) => {
      return addSpy.mock.calls.some((addCall) => {
        return addCall[0] === 'popstate' && addCall[1] === removeCall[1]
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

  it('RouterView works without router prop after plugin install', () => {
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

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

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

  it('RouterLink uses injected router when clicking', () => {
    const Home: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const NotFound: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

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

  it('RouterLink keeps default behavior for modifier/middle clicks', () => {
    const Home: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const NotFound: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

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

  it('RouterLink leaves target=_blank navigation to browser', () => {
    const Home: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const NotFound: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

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

  it('RouterView inside route component does not recurse infinitely', () => {
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

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

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

  it('RouterView re-renders when navigating via RouterLink', async () => {
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
