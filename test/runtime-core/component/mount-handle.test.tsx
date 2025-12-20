import { describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../../setup.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import { setErrorHandler } from '@/index.ts'
import { createVirtualNode } from '@/jsx-foundation/index.ts'
import { runtimeCoreAsyncSetupNotSupported } from '@/messages/index.ts'
import { mountComponent } from '@/runtime-core/index.ts'
import { domRendererOptions } from '@/runtime-dom/index.ts'
import { createRenderlessComponent } from '../helpers.ts'

describe('runtime-core mountComponent handle ok flag', () => {
  it('空渲染仍返回句柄且 ok=true', () => {
    const container = createTestContainer()

    const vnode = createVirtualNode({ type: createRenderlessComponent() })
    const mounted = mountComponent(domRendererOptions, vnode, container)

    expect(mounted).toBeDefined()
    expect(mounted?.ok).toBe(true)
    expect(mounted?.nodes).toEqual([])
    expect(container.childNodes.length).toBe(0)

    mounted?.teardown()
  })

  it('首渲染抛错时仍返回句柄且 ok=false', () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const boom = new Error('render failed')
    const Faulty: SetupComponent = () => {
      return () => {
        throw boom
      }
    }

    const vnode = createVirtualNode({ type: Faulty })
    const mounted = mountComponent(domRendererOptions, vnode, container)

    expect(mounted).toBeDefined()
    expect(mounted?.ok).toBe(false)
    expect(mounted?.nodes).toEqual([])
    expect(container.childNodes.length).toBe(0)
    expect(handler).toHaveBeenCalled()

    mounted?.teardown()

    setErrorHandler(undefined)
  })

  it('async setup 会被显式拒绝并上报准确错误', () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const AsyncSetup = (async () => {
      return () => {
        return undefined
      }
    }) as unknown as SetupComponent

    const vnode = createVirtualNode({ type: AsyncSetup })
    const mounted = mountComponent(domRendererOptions, vnode, container)

    expect(mounted).toBeUndefined()
    expect(container.childNodes.length).toBe(0)
    expect(handler).toHaveBeenCalled()

    const [error] = handler.mock.calls[0] ?? []

    expect(error.message).toContain(runtimeCoreAsyncSetupNotSupported)

    setErrorHandler(undefined)
  })
})
