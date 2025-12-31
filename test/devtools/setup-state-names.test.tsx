import { describe, expect, it } from 'vitest'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { ref, registerDevtoolsSetupStateName, render } from '@/index.ts'

describe('devtools setup state 命名', () => {
  it('registerDevtoolsSetupStateName 会把 ref0 重命名为变量名', () => {
    const container = createTestContainer()
    let captured: unknown

    const App: SetupComponent = () => {
      const count = ref(0)

      captured = count
      registerDevtoolsSetupStateName(count, 'count')

      return () => {
        return undefined
      }
    }

    const virtualNode = <App />

    render(virtualNode, container)

    const rootVnode = (container as unknown as { _vnode?: unknown })._vnode as {
      componentInstance?: unknown
    }

    const instance = rootVnode.componentInstance as {
      devtoolsRawSetupState?: Record<string, unknown>
    }

    expect(instance.devtoolsRawSetupState?.count).toBe(captured)
    expect(Object.hasOwn(instance.devtoolsRawSetupState ?? {}, 'ref0')).toBe(false)
  })

  it('同名登记会自动追加后缀避免冲突', () => {
    const container = createTestContainer()
    let first: unknown
    let second: unknown

    const App: SetupComponent = () => {
      const count = ref(0)

      first = count
      registerDevtoolsSetupStateName(count, 'count')

      const other = ref(1)

      second = other
      registerDevtoolsSetupStateName(other, 'count')

      return () => {
        return undefined
      }
    }

    const virtualNode = <App />

    render(virtualNode, container)

    const rootVnode = (container as unknown as { _vnode?: unknown })._vnode as {
      componentInstance?: unknown
    }

    const instance = rootVnode.componentInstance as {
      devtoolsRawSetupState?: Record<string, unknown>
    }

    const rawSetupState = instance.devtoolsRawSetupState ?? {}

    expect(rawSetupState.count).toBe(first)
    expect(rawSetupState['count$1']).toBe(second)
    expect(Object.hasOwn(rawSetupState, 'ref0')).toBe(false)
    expect(Object.hasOwn(rawSetupState, 'ref1')).toBe(false)
  })
})
