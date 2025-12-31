import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHostRenderer, findHostElementByClass, getHostElementText } from '../host-utils.ts'
import type { ErrorHandler, SetupComponent } from '@/index.ts'
import {
  nextTick,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
  setErrorHandler,
} from '@/index.ts'
import { runtimeCoreOnMountedOutsideSetup } from '@/messages/index.ts'
import { createRenderer, queueSchedulerJob } from '@/runtime-core/index.ts'
import { errorContexts } from '@/shared/index.ts'

describe('runtime-core 生命周期钩子', () => {
  afterEach(() => {
    setErrorHandler(undefined)
  })

  it('onMounted 在 post flush 执行且子先父后', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const calls: string[] = []

    const Child: SetupComponent = () => {
      onMounted(() => {
        calls.push('child mounted')
      })

      return () => {
        return <div class="child" />
      }
    }

    const Parent: SetupComponent = () => {
      onMounted(() => {
        calls.push('parent mounted')
      })

      return () => {
        return (
          <div class="parent">
            <Child />
          </div>
        )
      }
    }

    renderer.render(<Parent />, host.container)

    expect(calls).toEqual([])

    await nextTick()

    expect(calls).toEqual(['child mounted', 'parent mounted'])
  })

  it('post hook 内写状态不会被吞掉（onMounted -> update）', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const count = ref(0)
    const renderSpy = vi.fn()

    const App: SetupComponent = () => {
      onMounted(() => {
        count.value = 1
      })

      return () => {
        renderSpy()

        return <div class="count">{count.value}</div>
      }
    }

    renderer.render(<App />, host.container)

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(getHostElementText(findHostElementByClass(host.container, 'count'))).toBe('0')

    await nextTick()

    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(getHostElementText(findHostElementByClass(host.container, 'count'))).toBe('1')
  })

  it('onBeforeUpdate 同步触发，onUpdated 走 post 且子先父后', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const count = ref(0)
    const calls: string[] = []

    const Child: SetupComponent<{ count: number }> = (props) => {
      onBeforeUpdate(() => {
        calls.push('child beforeUpdate')
      })

      onUpdated(() => {
        calls.push('child updated')
      })

      return () => {
        return <div class="child">{props.count}</div>
      }
    }

    const Parent: SetupComponent = () => {
      onBeforeUpdate(() => {
        calls.push('parent beforeUpdate')
      })

      onUpdated(() => {
        calls.push('parent updated')
      })

      return () => {
        return (
          <div class="parent">
            <Child count={count.value} />
          </div>
        )
      }
    }

    renderer.render(<Parent />, host.container)
    await nextTick()

    calls.length = 0
    count.value = 1

    expect(calls).toEqual([])

    await nextTick()

    expect(calls).toEqual([
      'parent beforeUpdate',
      'child beforeUpdate',
      'child updated',
      'parent updated',
    ])
  })

  it('onUnmounted 走 post 且子先父后', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const show = ref(true)
    const calls: string[] = []

    const Child: SetupComponent = () => {
      onUnmounted(() => {
        calls.push('child unmounted')
      })

      return () => {
        return <div class="child" />
      }
    }

    const Parent: SetupComponent = () => {
      onUnmounted(() => {
        calls.push('parent unmounted')
      })

      return () => {
        return (
          <div class="parent">
            <Child />
          </div>
        )
      }
    }

    const App: SetupComponent = () => {
      return () => {
        return show.value ? <Parent /> : undefined
      }
    }

    renderer.render(<App />, host.container)
    await nextTick()

    show.value = false

    expect(calls).toEqual([])

    await nextTick()

    expect(calls).toEqual(['child unmounted', 'parent unmounted'])
  })

  it('组件卸载会跳过已入队的 mounted', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const calls: string[] = []

    const App: SetupComponent = () => {
      onMounted(() => {
        calls.push('mounted')
      })

      onUnmounted(() => {
        calls.push('unmounted')
      })

      return () => {
        return <div class="app" />
      }
    }

    renderer.render(<App />, host.container)
    renderer.render(undefined, host.container)

    await nextTick()

    expect(calls).toEqual(['unmounted'])
  })

  it('组件卸载会跳过已入队的 updated', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const count = ref(0)
    const calls: string[] = []

    const App: SetupComponent = () => {
      onUpdated(() => {
        calls.push('updated')
      })

      return () => {
        return <div class="count">{count.value}</div>
      }
    }

    renderer.render(<App />, host.container)
    await nextTick()

    count.value = 1

    queueSchedulerJob(() => {
      renderer.render(undefined, host.container)
    })

    await nextTick()

    expect(calls).toEqual([])
  })

  it('hook 抛错不会阻断同批次其它 hook，并走统一错误处理', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const calls: string[] = []
    const handler = vi.fn<ErrorHandler>()

    setErrorHandler(handler)

    const App: SetupComponent = () => {
      onMounted(() => {
        calls.push('a')
      })

      onMounted(() => {
        throw new Error('hook crash')
      })

      onMounted(() => {
        calls.push('b')
      })

      return () => {
        return <div class="app" />
      }
    }

    renderer.render(<App />, host.container)

    await nextTick()

    expect(calls).toEqual(['a', 'b'])
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error.message).toBe('hook crash')
    expect(context).toBe(errorContexts.componentLifecycleHook)
  })

  it('onMounted 在 setup 外调用会抛错', () => {
    let caught: unknown

    try {
      onMounted(() => {
        // Noop
      })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe(runtimeCoreOnMountedOutsideSetup)
  })
})
