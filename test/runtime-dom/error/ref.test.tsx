import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestContainer } from '$/index.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import { createApp, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('runtime-dom 组件错误隔离（ref）', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('ref 回调抛错会通知错误处理器且不影响卸载清理', () => {
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('ref failed')

    setErrorHandler(handler)

    const Root: SetupComponent = () => {
      return () => {
        return (
          <>
            <div data-testid="before">ok</div>
            <div
              data-testid="faulty"
              ref={() => {
                throw boom
              }}
            >
              bad
            </div>
          </>
        )
      }
    }

    const container = createTestContainer()
    const app = createApp(Root)

    app.mount(container)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.elementRef)
    expect(container.querySelector('[data-testid="before"]')?.textContent).toBe('ok')
    expect(container.querySelector('[data-testid="faulty"]')?.textContent).toBe('bad')

    app.unmount()

    expect(container.childNodes.length).toBe(0)
  })
})
