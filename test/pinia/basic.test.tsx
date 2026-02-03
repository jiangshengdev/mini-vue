import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHostWithApp, createRenderlessComponent } from '$/index.ts'
import {
  computed,
  createPinia,
  defineStore,
  ref,
  setErrorHandler,
  storeToRefs,
  type ErrorHandler,
  type SetupComponent,
} from '@/index.ts'
import {
  piniaDefineStoreDuplicateId,
  piniaNotInstalled,
  piniaSetupMustReturnObject,
} from '@/messages/index.ts'
import { piniaInjectionKey } from '@/pinia/index.ts'

describe('pinia（最小实现）', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('未安装 pinia 时 useStore 直接抛错', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const useCounterStore = defineStore('pinia-not-installed', () => {
      return { count: ref(0) }
    })

    const Root = createRenderlessComponent(() => {
      useCounterStore()
    })

    const { app, container } = createHostWithApp(Root)

    app.mount(container)

    expect(handler).toHaveBeenCalledTimes(1)

    const [error] = handler.mock.calls[0]

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe(piniaNotInstalled)
    expect((error as Error & { cause: unknown }).cause).toBe(piniaInjectionKey)
  })

  it('安装后同一 id store 单例复用，action 修改状态可被共享读取', () => {
    const useCounterStore = defineStore('pinia-singleton', () => {
      const count = ref(0)
      const inc = (): void => {
        count.value++
      }

      return { count, inc }
    })

    let storeA: ReturnType<typeof useCounterStore> | undefined
    let storeB: ReturnType<typeof useCounterStore> | undefined

    const ChildA = createRenderlessComponent(() => {
      storeA = useCounterStore()
    })
    const ChildB = createRenderlessComponent(() => {
      storeB = useCounterStore()
    })

    const Root: SetupComponent = () => {
      return () => {
        return (
          <div>
            <ChildA />
            <ChildB />
          </div>
        )
      }
    }

    const { app, container } = createHostWithApp(Root)
    app.use(createPinia())
    app.mount(container)

    expect(storeA).toBeTruthy()
    expect(storeB).toBeTruthy()
    expect(storeA).toBe(storeB)

    storeA?.inc()
    expect(storeB?.count.value).toBe(1)

    app.unmount()
  })

  it('同 id 不同定义在 defineStore 阶段直接报错', () => {
    defineStore('pinia-duplicate-definition', () => {
      return { ok: true }
    })

    expect(() => {
      defineStore('pinia-duplicate-definition', () => {
        return { ok: false }
      })
    }).toThrowError(piniaDefineStoreDuplicateId)
  })

  it('setup 必须返回对象', () => {
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const useBadStore = defineStore('pinia-setup-not-object', () => {
      return 1 as unknown as Record<string, unknown>
    })

    const Root = createRenderlessComponent(() => {
      useBadStore()
    })

    const { app, container } = createHostWithApp(Root)
    app.use(createPinia())

    app.mount(container)

    expect(handler).toHaveBeenCalledTimes(1)

    const [error] = handler.mock.calls[0]

    expect(error).toBeInstanceOf(TypeError)
    expect(error.message).toBe(piniaSetupMustReturnObject)
  })

  it('storeToRefs 仅提取 ref/computed 字段并忽略 action', () => {
    const useCounterStore = defineStore('pinia-store-to-refs', () => {
      const count = ref(0)
      const doubled = computed(() => count.value * 2)
      const inc = (): void => {
        count.value++
      }

      return { count, doubled, inc }
    })

    let extracted: unknown

    const Root = createRenderlessComponent(() => {
      const store = useCounterStore()
      extracted = storeToRefs(store)
    })

    const { app, container } = createHostWithApp(Root)
    app.use(createPinia())
    app.mount(container)

    const refs = extracted as {
      count?: unknown
      doubled?: unknown
      inc?: unknown
    }

    expect(refs.count).toBeTruthy()
    expect(refs.doubled).toBeTruthy()
    expect(refs.inc).toBeUndefined()

    app.unmount()
  })
})
