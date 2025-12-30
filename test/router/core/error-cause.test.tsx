import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ErrorHandler } from '@/index.ts'
import { createRenderlessComponent, createTestContainer } from '$/index.ts'
import { routerDuplicateInstallOnApp, routerNotFound } from '@/messages/index.ts'
import { createRouter, render, setErrorHandler, useRouter } from '@/index.ts'
import { routerInjectionKey } from '@/router/index.ts'

describe('router 错误 cause', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('useRouter 未注入 router 时抛错并在 cause 中暴露注入 key', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const Consumer = createRenderlessComponent(() => {
      useRouter()
    })
    const container = createTestContainer()

    render(<Consumer />, container)

    expect(handler).toHaveBeenCalledTimes(1)

    const [error] = handler.mock.calls[0]

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe(routerNotFound)
    expect((error as Error & { cause: unknown }).cause).toBe(routerInjectionKey)
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
