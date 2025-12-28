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

    app.unmount()
    expect(calls).toEqual(['install-a', 'install-b', 'cleanup-b', 'cleanup-a'])

    app.unmount()
    expect(calls).toEqual(['install-a', 'install-b', 'cleanup-b', 'cleanup-a'])
  })
})
