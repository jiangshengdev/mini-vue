import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import { createTestContainer } from '../../setup.ts'
import type { SetupComponent } from '@/index.ts'
import { createApp, reactive, setErrorHandler } from '@/index.ts'

/**
 * **Feature: vnode-diff-patch, Property 7: 错误隔离保持 DOM 状态**
 * **Validates: Requirements 5.1**
 */
describe('patch - 错误隔离', () => {
  it('render 抛错时保留上一轮 DOM 状态', () => {
    const state = reactive({ shouldThrow: false, count: 0 })
    const errorSpy = vi.fn()

    setErrorHandler(errorSpy)

    const Counter: SetupComponent = () => {
      return () => {
        if (state.shouldThrow) {
          throw new Error('render error')
        }

        return (
          <div>
            <span>count: {state.count}</span>
          </div>
        )
      }
    }

    const container = createTestContainer()
    const app = createApp(Counter)

    app.mount(container)

    expect(within(container).getByText('count: 0')).toBeDefined()

    /* 正常更新。 */
    state.count = 1
    expect(within(container).getByText('count: 1')).toBeDefined()

    /* 触发错误的更新。 */
    state.shouldThrow = true
    state.count = 2

    /* DOM 应该保持上一轮状态。 */
    expect(within(container).getByText('count: 1')).toBeDefined()
    expect(errorSpy).toHaveBeenCalled()

    /* 恢复正常后可以继续更新。 */
    state.shouldThrow = false
    state.count = 3

    expect(within(container).getByText('count: 3')).toBeDefined()

    app.unmount()
    setErrorHandler(undefined)
  })

  it('首次渲染抛错时不破坏容器', () => {
    const errorSpy = vi.fn()

    setErrorHandler(errorSpy)

    const Faulty: SetupComponent = () => {
      return () => {
        throw new Error('initial render error')
      }
    }

    const container = createTestContainer()
    const app = createApp(Faulty)

    app.mount(container)

    /* 容器应该保持空或不受影响。 */
    expect(container.children.length).toBe(0)
    expect(errorSpy).toHaveBeenCalled()

    setErrorHandler(undefined)
  })

  it('兄弟组件渲染错误不影响已挂载的组件', () => {
    const errorSpy = vi.fn()

    setErrorHandler(errorSpy)

    const state = reactive({ showFaulty: false })

    const Good: SetupComponent = () => {
      return () => {
        return <div>good</div>
      }
    }

    const Faulty: SetupComponent = () => {
      return () => {
        throw new Error('faulty component')
      }
    }

    const App: SetupComponent = () => {
      return () => {
        return (
          <>
            <Good />
            {state.showFaulty ? <Faulty /> : null}
          </>
        )
      }
    }

    const container = createTestContainer()
    const app = createApp(App)

    app.mount(container)

    expect(within(container).getByText('good')).toBeDefined()

    /* 触发错误组件的挂载。 */
    state.showFaulty = true

    /* 原有组件应该不受影响。 */
    expect(within(container).getByText('good')).toBeDefined()
    expect(errorSpy).toHaveBeenCalled()

    app.unmount()
    setErrorHandler(undefined)
  })
})
