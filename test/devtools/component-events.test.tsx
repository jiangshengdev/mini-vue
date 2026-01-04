import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { createApp, MiniVueDevtoolsPlugin, nextTick, reactive } from '@/index.ts'

function uninstallFakeDevtoolsHook() {
  delete (globalThis as unknown as { __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown })
    .__VUE_DEVTOOLS_GLOBAL_HOOK__
  delete (globalThis as unknown as { __VUE__?: unknown }).__VUE__
}

describe('devtools component lifecycle events', () => {
  afterEach(() => {
    uninstallFakeDevtoolsHook()
  })

  it('app:init 后组件更新/卸载应发射 component:updated/removed', async () => {
    const emit = vi.fn((event: string, ...payload: unknown[]) => {
      if (event === 'app:init') {
        const app = payload[0] as Record<string, unknown>

        app.__VUE_DEVTOOLS_NEXT_APP_RECORD__ = {}
      }
    })

    ;(
      globalThis as unknown as { __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown }
    ).__VUE_DEVTOOLS_GLOBAL_HOOK__ = { emit }

    let state: { count: number } | undefined

    const App: SetupComponent = () => {
      const data = reactive({ count: 0 })

      state = data

      return () => {
        return <div>{data.count}</div>
      }
    }

    const container = createTestContainer()
    const app = createApp(App)

    app.use(MiniVueDevtoolsPlugin)
    app.mount(container)

    state!.count = 1
    await nextTick()

    expect(
      emit.mock.calls.some((call) => {
        const name = call[0]
        const instance = call[4] as { type?: unknown } | undefined

        return name === 'component:updated' && instance?.type === App
      }),
    ).toBe(true)

    app.unmount()

    expect(
      emit.mock.calls.some((call) => {
        const name = call[0]
        const instance = call[4] as { type?: unknown } | undefined

        return name === 'component:removed' && instance?.type === App
      }),
    ).toBe(true)
  })
})
