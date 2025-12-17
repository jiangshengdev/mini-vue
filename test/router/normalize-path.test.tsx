import { afterEach, describe, expect, it } from 'vitest'
import type { SetupComponent } from '@/index.ts'
import { createRouter } from '@/index.ts'
import { normalizePath } from '@/router/index.ts'

describe('router: normalizePath', () => {
  afterEach(() => {
    globalThis.history.pushState(null, '', '/')
  })

  it('keeps path casing while stripping query and hash', () => {
    expect(normalizePath('/User/AbC?q=1#top')).toBe('/User/AbC')
    expect(normalizePath('User/AbC?foo=1')).toBe('/User/AbC')
  })

  it('matches routes case-sensitively and preserves navigation casing', () => {
    const Upper: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const lower: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const Fallback: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const router = createRouter({
      routes: [
        { path: '/Profile/ABC', component: Upper },
        { path: '/profile/abc', component: lower },
      ],
      fallback: Fallback,
    })

    router.navigate('/Profile/ABC')

    expect(router.currentRoute.value.component).toBe(Upper)
    expect(router.currentRoute.value.path).toBe('/Profile/ABC')
    expect(globalThis.location.pathname).toBe('/Profile/ABC')

    router.navigate('/profile/abc')

    expect(router.currentRoute.value.component).toBe(lower)
    expect(router.currentRoute.value.path).toBe('/profile/abc')
    expect(globalThis.location.pathname).toBe('/profile/abc')

    router.navigate('/PROFILE/ABC')

    expect(router.currentRoute.value.component).toBe(Fallback)
    expect(router.currentRoute.value.path).toBe('/PROFILE/ABC')
    expect(globalThis.location.pathname).toBe('/PROFILE/ABC')
  })
})
