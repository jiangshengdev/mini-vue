import { describe, expect, it, vi } from 'vitest'
import { createRenderlessComponent } from '$/index.ts'
import { runtimeCoreInvalidPlugin } from '@/messages/index.ts'
import { createAppInstance } from '@/runtime-core/index.ts'
import type { PluginInstallApp } from '@/shared/index.ts'

describe('runtime-core app.use', () => {
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

  it('函数式插件被视为无效插件', () => {
    const app = createAppInstance(
      { render: vi.fn(), unmount: vi.fn() },
      createRenderlessComponent(),
    )
    const plugin = vi.fn()
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

  it('按 name 去重的插件只安装一次', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())

    const installSpy = vi.fn()
    const plugin = { name: 'foo', install: installSpy }

    app.use(plugin)
    app.use(plugin)

    expect(installSpy).toHaveBeenCalledTimes(1)
  })

  it('收集 cleanup 并按 LIFO 执行，多次 unmount 静默忽略', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())
    const container = {}

    const calls: string[] = []
    const pluginA = {
      name: 'plugin-a',
      install: vi.fn(() => {
        calls.push('install-a')
      }),
      cleanup(_app: PluginInstallApp) {
        calls.push('cleanup-a')
      },
    }
    const pluginB = {
      name: 'plugin-b',
      install: vi.fn(() => {
        calls.push('install-b')
      }),
      cleanup(_app: PluginInstallApp) {
        calls.push('cleanup-b')
      },
    }

    app.use(pluginA)
    app.use(pluginB)

    expect(calls).toEqual(['install-a', 'install-b'])

    app.mount(container)
    app.unmount()
    expect(calls).toEqual(['install-a', 'install-b', 'cleanup-b', 'cleanup-a'])

    app.unmount()
    expect(calls).toEqual(['install-a', 'install-b', 'cleanup-b', 'cleanup-a'])
  })

  it('卸载后新注册的插件仍会执行 cleanup', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())
    const container = {}

    const cleanupA = vi.fn()
    const cleanupB = vi.fn()

    app.use({
      name: 'plugin-a',
      install: vi.fn(),
      cleanup: cleanupA,
    })

    app.mount(container)
    app.unmount()
    expect(cleanupA).toHaveBeenCalledTimes(1)

    app.use({
      name: 'plugin-b',
      install: vi.fn(),
      cleanup: cleanupB,
    })

    app.mount(container)
    app.unmount()
    expect(cleanupB).toHaveBeenCalledTimes(1)
  })

  it('卸载后可重新安装同名插件并重新触发 install', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())
    const container = {}

    const installSpy = vi.fn()
    const cleanup = vi.fn()
    const plugin = {
      name: 'plugin-a',
      install: installSpy,
      cleanup,
    }

    app.use(plugin)
    app.mount(container)
    app.unmount()

    expect(installSpy).toHaveBeenCalledTimes(1)
    expect(cleanup).toHaveBeenCalledTimes(1)

    app.use(plugin)
    app.mount(container)
    app.unmount()

    expect(installSpy).toHaveBeenCalledTimes(2)
    expect(cleanup).toHaveBeenCalledTimes(2)
  })

  it('未挂载前调用 unmount 也会执行一次 cleanup（重复调用不重复执行）', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())
    const container = {}

    const cleanup = vi.fn()

    app.use({
      name: 'plugin-a',
      install: vi.fn(),
      cleanup,
    })

    app.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)

    app.mount(container)
    app.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})
