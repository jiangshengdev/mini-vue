import { describe, expect, it, vi } from 'vitest'
import { createRenderlessComponent, createTestContainer } from '$/index.ts'
import { createAppInstance } from '@/runtime-core/index.ts'

describe('runtime-core createAppInstance mount 失败状态回滚', () => {
  it('render 抛错时不缓存 container 且不调用宿主 unmount', () => {
    const container = createTestContainer()
    const boom = new Error('render failed')

    const render = vi.fn(() => {
      throw boom
    })
    const unmount = vi.fn()

    const app = createAppInstance({ render, unmount }, createRenderlessComponent())

    expect(() => {
      app.mount(container)
    }).toThrow(boom)

    expect(render).toHaveBeenCalledTimes(1)
    expect(unmount).not.toHaveBeenCalled()

    app.unmount()

    expect(unmount).not.toHaveBeenCalled()
  })
})
