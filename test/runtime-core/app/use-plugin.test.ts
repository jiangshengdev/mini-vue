import { describe, expect, it, vi } from 'vitest'
import { createRenderlessComponent } from '$/index.ts'
import { runtimeCoreInvalidPlugin } from '@/messages/index.ts'
import { createAppInstance } from '@/runtime-core/index.ts'

describe('runtime-core app.use 错误 cause', () => {
  it('无效插件抛错时在 cause 中返回原始插件对象', () => {
    const app = createAppInstance(
      { render: vi.fn(), unmount: vi.fn() },
      createRenderlessComponent(),
    )
    const plugin = { foo: 'bar' }
    let caught: unknown

    try {
      app.use(plugin as never)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(TypeError)
    expect((caught as Error).message).toBe(runtimeCoreInvalidPlugin)
    expect((caught as Error & { cause: unknown }).cause).toBe(plugin)
  })
})
