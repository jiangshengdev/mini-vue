import { describe, expect, it, vi } from 'vitest'
import { createRenderlessComponent } from '$/index.ts'
import { runtimeCoreDuplicatePluginName, runtimeCoreInvalidPlugin } from '@/messages/index.ts'
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

  it('按 name 去重的插件重复注册时报错', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())

    const installSpy = vi.fn()
    const plugin = { name: 'foo', install: installSpy, uninstall: vi.fn() }

    app.use(plugin)
    expect(() => {
      app.use(plugin)
    }).toThrowError(runtimeCoreDuplicatePluginName)
    expect(installSpy).toHaveBeenCalledTimes(1)
  })

  it('收集 uninstall 并按 LIFO 执行，多次 unmount 静默忽略', () => {
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
      uninstall(_app: PluginInstallApp) {
        calls.push('uninstall-a')
      },
    }
    const pluginB = {
      name: 'plugin-b',
      install: vi.fn(() => {
        calls.push('install-b')
      }),
      uninstall(_app: PluginInstallApp) {
        calls.push('uninstall-b')
      },
    }

    app.use(pluginA)
    app.use(pluginB)

    expect(calls).toEqual(['install-a', 'install-b'])

    app.mount(container)
    app.unmount()
    expect(calls).toEqual(['install-a', 'install-b', 'uninstall-b', 'uninstall-a'])

    app.unmount()
    expect(calls).toEqual(['install-a', 'install-b', 'uninstall-b', 'uninstall-a'])
  })

  it('卸载后新注册的插件仍会执行 uninstall', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())
    const container = {}

    const uninstallA = vi.fn()
    const uninstallB = vi.fn()

    app.use({
      name: 'plugin-a',
      install: vi.fn(),
      uninstall: uninstallA,
    })

    app.mount(container)
    app.unmount()
    expect(uninstallA).toHaveBeenCalledTimes(1)

    app.use({
      name: 'plugin-b',
      install: vi.fn(),
      uninstall: uninstallB,
    })

    app.mount(container)
    app.unmount()
    expect(uninstallB).toHaveBeenCalledTimes(1)
  })

  it('卸载后可重新安装同名插件并重新触发 install', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())
    const container = {}

    const installSpy = vi.fn()
    const uninstall = vi.fn()
    const plugin = {
      name: 'plugin-a',
      install: installSpy,
      uninstall,
    }

    app.use(plugin)
    app.mount(container)
    app.unmount()

    expect(installSpy).toHaveBeenCalledTimes(1)
    expect(uninstall).toHaveBeenCalledTimes(1)

    app.use(plugin)
    app.mount(container)
    app.unmount()

    expect(installSpy).toHaveBeenCalledTimes(2)
    expect(uninstall).toHaveBeenCalledTimes(2)
  })

  it('未挂载前调用 unmount 也会执行一次 uninstall（重复调用不重复执行）', () => {
    const render = vi.fn()
    const unmount = vi.fn()
    const app = createAppInstance({ render, unmount }, createRenderlessComponent())
    const container = {}

    const uninstall = vi.fn()

    app.use({
      name: 'plugin-a',
      install: vi.fn(),
      uninstall,
    })

    app.unmount()
    expect(uninstall).toHaveBeenCalledTimes(1)

    app.mount(container)
    app.unmount()
    expect(uninstall).toHaveBeenCalledTimes(1)
  })
})
