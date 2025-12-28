import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SetupComponent } from '@/index.ts'
import { createRouter } from '@/index.ts'

describe('router: navigate 保留 query 和 hash', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.history.replaceState(null, '', '/')
  })

  it('推送完整 URL 同时保持规范化的路由 path', () => {
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
    expect(router.currentRoute.value.fullPath).toBe('/search?q=vue#top')
    expect(router.currentRoute.value.query).toBe('?q=vue')
    expect(router.currentRoute.value.hash).toBe('#top')

    router.stop()
  })

  it('初始化时 currentRoute 保留 query 和 hash', () => {
    const pushStateSpy = vi.spyOn(globalThis.history, 'pushState')

    globalThis.history.replaceState(null, '', '/search?q=vue#top')

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

    expect(pushStateSpy).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/search')
    expect(router.currentRoute.value.fullPath).toBe('/search?q=vue#top')
    expect(router.currentRoute.value.query).toBe('?q=vue')
    expect(router.currentRoute.value.hash).toBe('#top')

    router.stop()
  })
})
