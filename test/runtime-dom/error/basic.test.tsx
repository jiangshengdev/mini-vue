import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderIntoNewContainer } from '../helpers.ts'
import { createTestContainer } from '../../setup.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import { reactive, render, setErrorHandler } from '@/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('runtime-dom 组件错误隔离（基础）', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('setup 抛错会通知错误处理器且跳过挂载', () => {
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('setup failed')

    setErrorHandler(handler)

    const Faulty: SetupComponent = () => {
      throw boom
    }

    const container = renderIntoNewContainer(<Faulty />)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.componentSetup)
    expect(container.childNodes.length).toBe(0)
  })

  it('setup 抛错不影响兄弟挂载', () => {
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('setup failed')

    setErrorHandler(handler)

    const Faulty: SetupComponent = () => {
      throw boom
    }

    const Sibling: SetupComponent = () => {
      return () => {
        return <div data-testid="sibling">ok</div>
      }
    }

    const container = renderIntoNewContainer(
      <>
        <Faulty />
        <Sibling />
      </>,
    )

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.componentSetup)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
    expect(container.querySelector('[data-testid="faulty"]')).toBeNull()
  })

  it('首次渲染抛错会停止组件 effect 且不阻断兄弟渲染', () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('render failed')
    const state = reactive({ count: 0 })
    const renderSpy = vi.fn()
    const Sibling: SetupComponent = () => {
      return () => {
        return <div data-testid="sibling">ok</div>
      }
    }

    setErrorHandler(handler)

    /* 读取响应式后抛错，确保 effect 停止且兄弟继续渲染。 */
    const Faulty: SetupComponent = () => {
      return () => {
        renderSpy()
        void state.count

        throw boom
      }
    }

    render(
      <>
        <Faulty />
        <Sibling />
      </>,
      container,
    )

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.effectRunner)
    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')

    state.count += 1

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="sibling"]')?.textContent).toBe('ok')
  })

  it('更新阶段抛错会保留旧子树且不影响兄弟', () => {
    const container = createTestContainer()
    const handler = vi.fn<ErrorHandler>()
    const boom = new Error('update failed')
    const state = reactive({ count: 0 })

    setErrorHandler(handler)

    const Faulty: SetupComponent = () => {
      return () => {
        void state.count

        if (state.count > 0) {
          throw boom
        }

        return <div data-testid="faulty">fine</div>
      }
    }

    const Sibling: SetupComponent = () => {
      return () => {
        return <div data-testid="sibling">ok</div>
      }
    }

    render(
      <>
        <Faulty />
        <Sibling />
      </>,
      container,
    )

    const getFaulty = () => {
      return container.querySelector('[data-testid="faulty"]')
    }

    const getSibling = () => {
      return container.querySelector('[data-testid="sibling"]')
    }

    expect(getFaulty()?.textContent).toBe('fine')
    expect(getSibling()?.textContent).toBe('ok')
    expect(handler).not.toHaveBeenCalled()

    state.count += 1

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(errorContexts.effectRunner)
    expect(getFaulty()?.textContent).toBe('fine')
    expect(getSibling()?.textContent).toBe('ok')

    state.count += 1

    expect(handler).toHaveBeenCalledTimes(1)
    expect(getFaulty()?.textContent).toBe('fine')
    expect(getSibling()?.textContent).toBe('ok')
  })
})
