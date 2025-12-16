import { describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '../../setup.ts'
import type { SetupComponent } from '@/index.ts'
import { createAppInstance } from '@/runtime-core/index.ts'

describe('runtime-core createAppInstance mount failure state rollback', () => {
  it('does not cache container or invoke host unmount when render throws', () => {
    const container = createTestContainer()
    const boom = new Error('render failed')

    const render = vi.fn(() => {
      throw boom
    })
    const unmount = vi.fn()

    const Root: SetupComponent = () => {
      return () => {
        return <div>root</div>
      }
    }

    const app = createAppInstance({ render, unmount }, Root)

    expect(() => {
      app.mount(container)
    }).toThrow(boom)

    expect(render).toHaveBeenCalledTimes(1)
    expect(unmount).not.toHaveBeenCalled()

    app.unmount()

    expect(unmount).not.toHaveBeenCalled()
  })
})
