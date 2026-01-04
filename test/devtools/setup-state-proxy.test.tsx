import { describe, expect, it } from 'vitest'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import {
  computed,
  nextTick,
  reactive,
  ref,
  registerDevtoolsSetupStateName,
  render,
} from '@/index.ts'

type DevtoolsSetupState = Record<string, unknown>

interface DevtoolsSetupStateInstance {
  devtoolsRawSetupState?: DevtoolsSetupState
  setupState?: DevtoolsSetupState
}

interface RootVnodeWithComponentInstance {
  componentInstance?: unknown
}

interface ContainerWithRootVnode {
  _vnode?: RootVnodeWithComponentInstance
}

function resolveRootDevtoolsInstance(container: unknown): DevtoolsSetupStateInstance {
  const rootVnode = (container as ContainerWithRootVnode)._vnode

  const instance = rootVnode?.componentInstance as DevtoolsSetupStateInstance | undefined

  if (!instance) {
    throw new Error('test: 未找到 root instance')
  }

  return instance
}

describe('devtools setupState 代理', () => {
  it('ref({}) 应只收集 ref0（不额外收集 reactive0）', () => {
    const container = createTestContainer()

    const App: SetupComponent = () => {
      ref({ count: 0 })

      return () => {
        return undefined
      }
    }

    render(<App />, container)

    const instance = resolveRootDevtoolsInstance(container)
    const keys = Object.keys(instance.devtoolsRawSetupState ?? {})

    expect(keys).toContain('ref0')
    expect(
      keys.some((key) => {
        return key.startsWith('reactive')
      }),
    ).toBe(false)
  })

  it('ref([]) 应只收集 ref0（不额外收集 reactive0）', () => {
    const container = createTestContainer()

    const App: SetupComponent = () => {
      ref([1])

      return () => {
        return undefined
      }
    }

    render(<App />, container)

    const instance = resolveRootDevtoolsInstance(container)
    const keys = Object.keys(instance.devtoolsRawSetupState ?? {})

    expect(keys).toContain('ref0')
    expect(
      keys.some((key) => {
        return key.startsWith('reactive')
      }),
    ).toBe(false)
  })

  it('setupState 应解包 ref 并支持写回触发更新', async () => {
    const container = createTestContainer()
    let captured: { value: number } | undefined

    const App: SetupComponent = () => {
      const count = ref(0)

      captured = count
      registerDevtoolsSetupStateName(count, 'count')

      return () => {
        return <div>{count.value}</div>
      }
    }

    render(<App />, container)

    const instance = resolveRootDevtoolsInstance(container)
    const setupState = instance.setupState as unknown as { count?: unknown }

    expect(setupState.count).toBe(0)

    setupState.count = 2

    expect(captured?.value).toBe(2)

    await nextTick()

    expect((container.textContent ?? '').trim()).toBe('2')
  })

  it('setupState 写入只读 computed 应忽略且不抛错', () => {
    const container = createTestContainer()
    let captured: { value: number; __v_isReadonly?: unknown } | undefined

    const App: SetupComponent = () => {
      const count = ref(1)
      const doubled = computed(() => {
        return count.value * 2
      })

      captured = doubled as unknown as typeof captured
      registerDevtoolsSetupStateName(doubled, 'doubled')

      return () => {
        return <div>{doubled.value}</div>
      }
    }

    render(<App />, container)

    expect(captured?.__v_isReadonly).toBe(true)

    const instance = resolveRootDevtoolsInstance(container)
    const setupState = instance.setupState as unknown as { doubled?: unknown }

    expect(setupState.doubled).toBe(2)
    expect(() => {
      setupState.doubled = 10
    }).not.toThrow()
    expect(captured?.value).toBe(2)
  })

  it('setupState 应透传 reactive 并支持编辑字段触发更新', async () => {
    const container = createTestContainer()
    let captured: { count: number } | undefined

    const App: SetupComponent = () => {
      const data = reactive({ count: 0 })

      captured = data
      registerDevtoolsSetupStateName(data, 'data')

      return () => {
        return <div>{data.count}</div>
      }
    }

    render(<App />, container)

    const instance = resolveRootDevtoolsInstance(container)
    const setupState = instance.setupState as unknown as { data?: unknown }
    const setupData = setupState.data as { count?: number } | undefined

    expect(setupData?.count).toBe(0)

    if (!setupData) {
      throw new Error('test: 未找到 setupState.data')
    }

    setupData.count = 3

    expect(captured?.count).toBe(3)

    await nextTick()

    expect((container.textContent ?? '').trim()).toBe('3')
  })
})
