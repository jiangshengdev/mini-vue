import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { createApp, MiniVueDevtoolsPlugin } from '@/index.ts'

function uninstallFakeDevtoolsHook() {
  delete (globalThis as unknown as { __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown })
    .__VUE_DEVTOOLS_GLOBAL_HOOK__
  delete (globalThis as unknown as { __VUE__?: unknown }).__VUE__
}

describe('devtools component picker backfill', () => {
  afterEach(() => {
    uninstallFakeDevtoolsHook()
  })

  it('app:init 后应全量回填 component:added 以补齐 instanceMap', () => {
    const emit = vi.fn((event: string, ...payload: unknown[]) => {
      if (event === 'app:init') {
        const app = payload[0] as Record<string, unknown>

        app.__VUE_DEVTOOLS_NEXT_APP_RECORD__ = {}
      }
    })

    ;(
      globalThis as unknown as { __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown }
    ).__VUE_DEVTOOLS_GLOBAL_HOOK__ = { emit }

    const Child: SetupComponent = () => {
      return () => {
        return <div data-testid="child">child</div>
      }
    }

    const App: SetupComponent = () => {
      return () => {
        return (
          <div>
            <Child />
          </div>
        )
      }
    }

    const container = createTestContainer()
    const app = createApp(App)

    app.use(MiniVueDevtoolsPlugin)
    app.mount(container)

    expect(
      emit.mock.calls.some(([name]) => {
        return name === 'app:init'
      }),
    ).toBe(true)

    const addedCalls = emit.mock.calls.filter(([name]) => {
      return name === 'component:added'
    })

    expect(addedCalls).toHaveLength(2)

    const instances = addedCalls.map((call) => {
      return call[4] as { type?: unknown } | undefined
    })

    expect(
      instances.some((instance) => {
        return instance?.type === App
      }),
    ).toBe(true)
    expect(
      instances.some((instance) => {
        return instance?.type === Child
      }),
    ).toBe(true)
  })
})
