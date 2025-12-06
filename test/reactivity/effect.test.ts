import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeErrorHandler } from '@/index.ts'
import {
  computed,
  effect,
  effectScope,
  onScopeDispose,
  reactive,
  setRuntimeErrorHandler,
} from '@/index.ts'
import * as dependencyUtils from '@/reactivity/internals/dependency-utils.ts'
import { effectStack } from '@/reactivity/internals/effect-stack.ts'
import { runtimeErrorContexts } from '@/shared/index.ts'

describe('effect', () => {
  afterEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  it('注册后会立刻执行一次副作用', () => {
    const state = reactive({ count: 0 })
    let observed = -1

    function effectFn() {
      observed = state.count
    }

    effect(effectFn)

    expect(observed).toBe(0)

    state.count = 1
    expect(observed).toBe(1)
  })

  it('返回的句柄可手动重新触发', () => {
    const state = reactive({ count: 0 })
    let dummy = -1

    function effectFn() {
      dummy = state.count

      return dummy
    }

    const handle = effect(effectFn)

    expect(dummy).toBe(0)

    state.count = 2
    expect(dummy).toBe(2)

    const result = handle.run()

    expect(result).toBe(2)
    expect(dummy).toBe(2)
  })

  it('重复赋值相同内容不会再次执行 effect', () => {
    const state = reactive({ count: 0 })
    let runCount = 0

    function effectFn() {
      runCount += 1
      void state.count
    }

    effect(effectFn)

    expect(runCount).toBe(1)

    state.count = 0
    expect(runCount).toBe(1)

    state.count = 1
    expect(runCount).toBe(2)
  })

  it('调用 stop 后不会再响应依赖变更', () => {
    const state = reactive({ count: 0 })
    let runCount = 0

    const handle = effect(() => {
      runCount += 1
      void state.count
    })

    expect(runCount).toBe(1)

    state.count = 1
    expect(runCount).toBe(2)

    handle.stop()

    state.count = 2
    expect(runCount).toBe(2)

    handle.run()
    expect(runCount).toBe(3)

    state.count = 3
    expect(runCount).toBe(3)
  })

  it('依赖切换后旧字段不会再触发 effect', () => {
    const state = reactive({ toggle: true, first: 1, second: 2 })
    let captured = 0
    let runCount = 0

    function effectFn() {
      runCount += 1
      captured = state.toggle ? state.first : state.second
    }

    effect(effectFn)

    expect(captured).toBe(1)
    expect(runCount).toBe(1)

    state.second = 5
    expect(captured).toBe(1)
    expect(runCount).toBe(1)

    state.toggle = false
    expect(captured).toBe(5)
    expect(runCount).toBe(2)

    state.first = 10
    expect(captured).toBe(5)
    expect(runCount).toBe(2)

    state.second = 20
    expect(captured).toBe(20)
    expect(runCount).toBe(3)
  })

  it('嵌套 effect 只响应各自依赖', () => {
    const state = reactive({ outer: 0, inner: 0 })
    let outerRuns = 0
    let innerRuns = 0

    function outerEffectFn() {
      outerRuns += 1
      void state.outer

      function innerEffectFn() {
        innerRuns += 1
        void state.inner
      }

      effect(innerEffectFn)
    }

    effect(outerEffectFn)

    state.inner = 1
    expect(outerRuns).toBe(1)
    expect(innerRuns).toBe(2)

    state.outer = 1
    expect(outerRuns).toBe(2)
    expect(innerRuns).toBe(3)

    state.inner = 2
    expect(outerRuns).toBe(2)
    expect(innerRuns).toBe(4)
  })

  it('支持 scheduler 自定义调度时延迟执行', () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    const jobs: Array<() => void> = []

    effect(
      () => {
        runCount += 1
        void state.count
      },
      {
        scheduler(job) {
          jobs.push(job)
        },
      },
    )

    expect(runCount).toBe(1)
    expect(jobs.length).toBe(0)

    state.count = 1
    expect(runCount).toBe(1)
    expect(jobs.length).toBe(1)

    jobs.shift()?.()
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)

    state.count = 2
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(1)
  })

  it('scheduler 在 stop 后仍会执行已排队的任务', () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    const jobs: Array<() => void> = []

    const handle = effect(
      () => {
        runCount += 1
        void state.count
      },
      {
        scheduler(job) {
          jobs.push(job)
        },
      },
    )

    expect(runCount).toBe(1)

    state.count = 1
    expect(runCount).toBe(1)
    expect(jobs.length).toBe(1)

    const job = jobs.shift()

    handle.stop()

    job?.()
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)

    state.count = 2
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)
  })

  it('scheduler 在 stop 后执行的任务不会重新收集依赖', () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    const jobs: Array<() => void> = []

    const handle = effect(
      () => {
        runCount += 1
        void state.count
      },
      {
        scheduler(job) {
          jobs.push(job)
        },
      },
    )

    expect(runCount).toBe(1)

    state.count = 1
    const job = jobs.shift()

    handle.stop()

    job?.()
    expect(runCount).toBe(2)

    state.count = 2
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)

    state.count = 3
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)
  })

  it('effect cleanup 抛错会通知错误处理器并继续执行剩余清理', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<RuntimeErrorHandler>()
    const cleanupOrder: string[] = []

    setRuntimeErrorHandler(handler)

    effect(() => {
      void state.count

      effectStack.current?.registerCleanup(() => {
        cleanupOrder.push('first')
        throw new Error('effect cleanup failed')
      })

      effectStack.current?.registerCleanup(() => {
        cleanupOrder.push('second')
      })
    })

    state.count = 1

    expect(cleanupOrder).toEqual(['first', 'second'])
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('effect cleanup failed')
    expect(context).toBe(runtimeErrorContexts.effectCleanup)
  })

  it('effect 抛错会通知错误处理器并保持原有抛出行为', () => {
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('effect failed')

    setRuntimeErrorHandler(handler)

    expect(() => {
      effect(() => {
        throw boom
      })
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectRunner)
  })

  it('停止后的 effect 重新执行抛错也会触发错误处理', () => {
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('stopped effect failed')
    let shouldThrow = false

    setRuntimeErrorHandler(handler)

    const handle = effect(() => {
      if (shouldThrow) {
        throw boom
      }
    })

    handle.stop()
    shouldThrow = true

    expect(() => {
      handle.run()
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectRunner)
  })

  it('scheduler 抛错时不会阻断其余 effect 并触发统一错误处理', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<RuntimeErrorHandler>()

    setRuntimeErrorHandler(handler)

    effect(
      () => {
        void state.count
      },
      {
        scheduler() {
          throw new Error('scheduler failed')
        },
      },
    )

    let fallbackRuns = 0

    effect(() => {
      fallbackRuns += 1
      void state.count
    })

    expect(fallbackRuns).toBe(1)

    state.count = 1

    expect(fallbackRuns).toBe(2)
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('scheduler failed')
    expect(context).toBe(runtimeErrorContexts.scheduler)
  })

  it('删除属性会触发相关 effect', () => {
    const state = reactive<Partial<Record<string, number>>>({ foo: 1 })
    let runCount = 0

    effect(() => {
      runCount += 1
      void state.foo
    })

    expect(runCount).toBe(1)

    Reflect.deleteProperty(state, 'foo')
    expect(runCount).toBe(2)
  })

  it('Object.keys 会追踪对象结构变化', () => {
    const state = reactive<Partial<Record<string, number>>>({ foo: 1 })
    let keys: string[] = []

    effect(() => {
      keys = Object.keys(state)
    })

    expect(keys).toEqual(['foo'])

    state.bar = 2
    expect(keys).toEqual(['foo', 'bar'])

    Reflect.deleteProperty(state, 'foo')
    expect(keys).toEqual(['bar'])
  })

  it('in 操作符同样可建立依赖', () => {
    const state = reactive<Partial<Record<string, number>>>({})
    let hasFoo = false

    effect(() => {
      hasFoo = 'foo' in state
    })

    expect(hasFoo).toBe(false)

    state.foo = 1
    expect(hasFoo).toBe(true)

    Reflect.deleteProperty(state, 'foo')
    expect(hasFoo).toBe(false)
  })

  it('数组索引与长度变化都会触发 effect', () => {
    const list: number[] = reactive([])
    let length = -1
    let first = -1

    effect(() => {
      length = list.length
    })

    effect(() => {
      first = list[0] ?? -1
    })

    expect(length).toBe(0)
    expect(first).toBe(-1)

    list.push(10)
    expect(length).toBe(1)
    expect(first).toBe(10)
  })

  it('缩短数组长度会触发被截断索引的依赖', () => {
    const list: number[] = reactive([1, 2, 3])
    let third = 0

    effect(() => {
      third = list[2] ?? -1
    })

    expect(third).toBe(3)

    list.length = 2
    expect(third).toBe(-1)
  })

  it('effectScope 停止后会级联停止内部 effect', () => {
    const state = reactive({ count: 0 })
    const scope = effectScope()
    let observed = -1

    scope.run(() => {
      effect(() => {
        observed = state.count
      })
    })

    expect(observed).toBe(0)

    state.count = 1
    expect(observed).toBe(1)

    scope.stop()

    state.count = 2
    expect(observed).toBe(1)
  })

  it('effectScope 停止会同步清理 computed 派生值', () => {
    const scope = effectScope()
    const state = reactive({ count: 0 })
    const observed: number[] = []

    scope.run(() => {
      const doubled = computed(() => {
        return state.count * 2
      })

      effect(() => {
        observed.push(doubled.value)
      })
    })

    expect(observed).toEqual([0])

    state.count = 1
    expect(observed).toEqual([0, 2])

    scope.stop()

    state.count = 2
    expect(observed).toEqual([0, 2])
  })

  it('effectScope 停止时 cleanup 抛错不会阻断剩余任务', () => {
    const scope = effectScope()
    const handler = vi.fn<RuntimeErrorHandler>()
    const cleanupOrder: string[] = []

    setRuntimeErrorHandler(handler)

    scope.run(() => {
      onScopeDispose(() => {
        cleanupOrder.push('first')
        throw new Error('scope cleanup failed')
      })

      onScopeDispose(() => {
        cleanupOrder.push('second')
      })
    })

    scope.stop()

    expect(cleanupOrder).toEqual(['first', 'second'])
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('scope cleanup failed')
    expect(context).toBe(runtimeErrorContexts.effectScopeCleanup)
  })

  it('effectScope.run 抛错会触发错误处理器', () => {
    const scope = effectScope()
    const handler = vi.fn<RuntimeErrorHandler>()
    const boom = new Error('scope failed')

    setRuntimeErrorHandler(handler)

    expect(() => {
      scope.run(() => {
        throw boom
      })
    }).toThrow(boom)

    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect(error).toBe(boom)
    expect(context).toBe(runtimeErrorContexts.effectScopeRun)
  })

  it('无活跃 effect 读取不会创建空依赖桶', () => {
    const state = reactive({ count: 0 })
    const triggerSpy = vi.spyOn(dependencyUtils, 'triggerEffects')

    try {
      /* 直接读取属性，此时不存在活跃 effect。 */
      void state.count

      /* 修改属性应不会触发 triggerEffects，因为没有任何依赖桶被创建。 */
      state.count = 1

      expect(triggerSpy).not.toHaveBeenCalled()
    } finally {
      triggerSpy.mockRestore()
    }
  })
})
