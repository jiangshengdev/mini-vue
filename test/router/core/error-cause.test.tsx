import { describe, expect, it, vi } from 'vitest'
import { createRenderlessComponent } from '$/index.ts'
import { routerDuplicateInstallOnApp, routerNotFound } from '@/messages/index.ts'
import { createRouter, useRouter } from '@/index.ts'
import { routerInjectionKey } from '@/router/index.ts'

vi.mock('@/runtime-core/index.ts', async () => {
  const actual = await vi.importActual('@/runtime-core/index.ts')

  return {
    ...actual,
    inject: vi.fn(() => {
      return undefined
    }),
  }
})

describe('router 错误 cause', () => {
  it('useRouter 未注入 router 时抛错并在 cause 中暴露注入 key', () => {
    let caught: unknown

    try {
      useRouter()
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe(routerNotFound)
    expect((caught as Error & { cause: unknown }).cause).toBe(routerInjectionKey)
  })

  it('router.install 重复调用时在 cause 中携带 app', () => {
    const Fallback = createRenderlessComponent()
    const RouteComponent = createRenderlessComponent()
    const router = createRouter({
      routes: [{ path: '/', component: RouteComponent }],
      fallback: Fallback,
    })
    const app = { provide: vi.fn() }
    let caught: unknown

    router.install(app as never)

    try {
      router.install(app as never)
    } catch (error) {
      caught = error
    } finally {
      router.stop()
    }

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe(routerDuplicateInstallOnApp)
    expect((caught as Error & { cause: unknown }).cause).toBe(app)
  })
})
