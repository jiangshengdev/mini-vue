import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SetupComponent } from '@/index.ts'
import { createRouter } from '@/index.ts'

describe('router: navigate retains query and hash', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.history.replaceState(null, '', '/')
  })

  it('pushes full URL while keeping normalized route path', () => {
    const pushStateSpy = vi.spyOn(globalThis.history, 'pushState')

    const Search: SetupComponent = () => {
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
      routes: [{ path: '/search', component: Search }],
      fallback: NotFound,
    })

    router.navigate('/search?q=vue#top')

    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/search?q=vue#top')
    expect(router.currentRoute.value.path).toBe('/search')

    router.stop()
  })
})
