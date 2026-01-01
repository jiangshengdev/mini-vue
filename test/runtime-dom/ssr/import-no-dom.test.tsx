import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SetupComponent } from '@/index.ts'
import { runtimeDomDocumentUnavailable } from '@/messages/index.ts'

describe('runtime-dom: SSR/no DOM import safety', () => {
  const canSimulateNoDocument = () => {
    if (typeof document === 'undefined') {
      return true
    }

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')

    return descriptor?.configurable === true
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('imports runtime-dom entry without throwing', async () => {
    await expect(import('@/runtime-dom/index.ts')).resolves.toBeTruthy()
  })

  it('imports top-level entry without throwing', async () => {
    await expect(import('@/index.ts')).resolves.toBeTruthy()
  })

  it.runIf(canSimulateNoDocument())(
    'throws a clear error when mounting by selector without document',
    async () => {
      if (typeof document !== 'undefined') {
        vi.stubGlobal('document', undefined)
        vi.resetModules()
      }

      const { createApp } = await import('@/runtime-dom/index.ts')

      const App: SetupComponent = () => {
        return () => {
          return undefined
        }
      }

      const app = createApp(App)

      expect(() => {
        app.mount('#app')
      }).toThrow(runtimeDomDocumentUnavailable)
    },
  )
})
