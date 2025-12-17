import { describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../../setup.ts'
import type { SetupComponent } from '@/index.ts'
import { createApp, createRouter, ref, RouterLink, RouterView } from '@/index.ts'
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
})
