import { describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../setup.ts'
import {
  createApp,
  createRouter,
  ref,
  RouterLink,
  RouterView
  
} from '@/index.ts'
import type {SetupComponent} from '@/index.ts';

describe('runtime-dom: router injection', () => {
  it('RouterView works without router prop after plugin install', () => {
    const rendered = ref('')

    const Home: SetupComponent = () => {
      rendered.value = 'home'

      return () => {return undefined}
    }

    const NotFound: SetupComponent = () => {
      rendered.value = '404'

      return () => {return undefined}
    }

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

    const Root: SetupComponent = () => {
      return () => {return <RouterView />}
    }

    const app = createApp(Root)

    app.use(router)
    app.mount(createTestContainer())

    expect(rendered.value).toBe('home')

    app.unmount()
    router.stop()
  })

  it('RouterLink uses injected router when clicking', () => {
    const Home: SetupComponent = () => {return () => {return undefined}}
    const NotFound: SetupComponent = () => {return () => {return undefined}}

    const router = createRouter({
      routes: [{ path: '/', component: Home }],
      fallback: NotFound,
    })

    const navigateSpy = vi.spyOn(router, 'navigate')

    const Root: SetupComponent = () => {
      return () => {return <RouterLink to="/counter">go</RouterLink>}
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
